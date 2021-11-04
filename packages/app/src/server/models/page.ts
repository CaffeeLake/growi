/* eslint-disable @typescript-eslint/no-explicit-any */

import mongoose, {
  Schema, Model, Document,
} from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import uniqueValidator from 'mongoose-unique-validator';
import nodePath from 'path';

import { getOrCreateModel, pagePathUtils } from '@growi/core';
import loggerFactory from '../../utils/logger';
import Crowi from '../crowi';
import { IPage } from '../../interfaces/page';
import { getPageSchema, PageQueryBuilder } from './obsolete-page';

const { isTopPage } = pagePathUtils;

const logger = loggerFactory('growi:models:page');


/*
 * define schema
 */
const GRANT_PUBLIC = 1;
const GRANT_RESTRICTED = 2;
const GRANT_SPECIFIED = 3;
const GRANT_OWNER = 4;
const GRANT_USER_GROUP = 5;
const PAGE_GRANT_ERROR = 1;
const STATUS_PUBLISHED = 'published';
const STATUS_DELETED = 'deleted';

export interface PageDocument extends IPage, Document {}

export interface PageModel extends Model<PageDocument> {
  createEmptyPagesByPaths(paths: string[]): Promise<void>
  getParentIdAndFillAncestors(path: string): Promise<string | null>
  findByPathAndViewerV5(path: string | null, user, userGroups): Promise<IPage[]>
  findSiblingsByPathAndViewer(path: string | null, user, userGroups): Promise<IPage[]>
  findAncestorsById(path: string): Promise<IPage[]>
}

const ObjectId = mongoose.Schema.Types.ObjectId;

const schema = new Schema<PageDocument, PageModel>({
  parent: {
    type: ObjectId, ref: 'Page', index: true, default: null,
  },
  isEmpty: { type: Boolean, default: false },
  path: {
    type: String, required: true, index: true,
  },
  revision: { type: ObjectId, ref: 'Revision' },
  redirectTo: { type: String, index: true },
  status: { type: String, default: STATUS_PUBLISHED, index: true },
  grant: { type: Number, default: GRANT_PUBLIC, index: true },
  grantedUsers: [{ type: ObjectId, ref: 'User' }],
  grantedGroup: { type: ObjectId, ref: 'UserGroup', index: true },
  creator: { type: ObjectId, ref: 'User', index: true },
  lastUpdateUser: { type: ObjectId, ref: 'User' },
  liker: [{ type: ObjectId, ref: 'User' }],
  seenUsers: [{ type: ObjectId, ref: 'User' }],
  commentCount: { type: Number, default: 0 },
  slackChannels: { type: String },
  pageIdOnHackmd: { type: String },
  revisionHackmdSynced: { type: ObjectId, ref: 'Revision' }, // the revision that is synced to HackMD
  hasDraftOnHackmd: { type: Boolean }, // set true if revision and revisionHackmdSynced are same but HackMD document has modified
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deleteUser: { type: ObjectId, ref: 'User' },
  deletedAt: { type: Date },
}, {
  toJSON: { getters: true },
  toObject: { getters: true },
});
// apply plugins
schema.plugin(mongoosePaginate);
schema.plugin(uniqueValidator);


/*
 * Methods
 */
const collectAncestorPaths = (path: string, ancestorPaths: string[] = []): string[] => {
  if (isTopPage(path)) return [];

  const parentPath = nodePath.dirname(path);
  ancestorPaths.push(parentPath);

  if (!isTopPage(path)) return collectAncestorPaths(parentPath, ancestorPaths);

  return ancestorPaths;
};

schema.statics.createEmptyPagesByPaths = async function(paths: string[]): Promise<void> {
  // find existing parents
  const builder = new PageQueryBuilder(this.find({}, { _id: 0, path: 1 }));
  const existingPages = await builder
    .addConditionToListByPathsArray(paths)
    .query
    .lean()
    .exec();
  const existingPagePaths = existingPages.map(page => page.path);

  // paths to create empty pages
  const notExistingPagePaths = paths.filter(path => !existingPagePaths.includes(path));

  // insertMany empty pages
  try {
    await this.insertMany(notExistingPagePaths.map(path => ({ path, isEmpty: true })));
  }
  catch (err) {
    logger.error('Failed to insert empty pages.', err);
    throw err;
  }
};

schema.statics.getParentIdAndFillAncestors = async function(path: string): Promise<string | null> {
  const parentPath = nodePath.dirname(path);

  const parent = await this.findOne({ path: parentPath }); // find the oldest parent which must always be the true parent
  if (parent != null) { // fill parents if parent is null
    return parent._id;
  }

  const ancestorPaths = collectAncestorPaths(path); // paths of parents need to be created

  // just create ancestors with empty pages
  await this.createEmptyPagesByPaths(ancestorPaths);

  // find ancestors
  const builder = new PageQueryBuilder(this.find({}, { _id: 1, path: 1 }));
  const ancestors = await builder
    .addConditionToListByPathsArray(ancestorPaths)
    .addConditionToSortAncestorPages()
    .query
    .lean()
    .exec();


  const ancestorsMap = new Map(); // Map<path, _id>
  ancestors.forEach(page => ancestorsMap.set(page.path, page._id));

  // bulkWrite to update ancestors
  const nonRootAncestors = ancestors.filter(page => !isTopPage(page.path));
  const operations = nonRootAncestors.map((page) => {
    const { path } = page;
    const parentPath = nodePath.dirname(path);
    return {
      updateOne: {
        filter: {
          path,
        },
        update: {
          parent: ancestorsMap.get(parentPath),
        },
      },
    };
  });
  await this.bulkWrite(operations);

  const parentId = ancestorsMap.get(parentPath);
  return parentId;
};

const addViewerCondition = async(queryBuilder: PageQueryBuilder, user, userGroups): Promise<void> => {
  let relatedUserGroups = userGroups;
  if (user != null && relatedUserGroups == null) {
    const UserGroupRelation: any = mongoose.model('UserGroupRelation');
    relatedUserGroups = await UserGroupRelation.findAllUserGroupIdsRelatedToUser(user);
  }

  queryBuilder.addConditionToFilteringByViewer(user, relatedUserGroups, true);
};

schema.statics.findByPathAndViewer = async function(path: string | null, user, userGroups, useFindOne = true): Promise<IPage[]> {
  if (path == null) {
    throw new Error('path is required.');
  }

  const baseQuery = useFindOne ? this.findOne({ path }) : this.find({ path });
  const queryBuilder = new PageQueryBuilder(baseQuery);
  await addViewerCondition(queryBuilder, user, userGroups);

  return queryBuilder.query.exec();
};

schema.statics.findSiblingsByPathAndViewer = async function(path: string | null, user, userGroups): Promise<IPage[]> {
  if (path == null) {
    throw new Error('path is required.');
  }

  const parentPath = nodePath.dirname(path);

  // regexr.com/6889f
  // ex. /parent/any_child OR /any_level1
  let regexp = new RegExp(`^${parentPath}(\\/[^/]+)\\/?$`, 'g');
  // ex. / OR /any_level1
  if (isTopPage(path)) regexp = /^\/[^/]*$/g;

  const queryBuilder = new PageQueryBuilder(this.find({ path: regexp }));
  await addViewerCondition(queryBuilder, user, userGroups);

  return queryBuilder.query.lean().exec();
};

schema.statics.findAncestorsByPath = async function(path: string): Promise<IPage[]> {
  const ancestorPaths = collectAncestorPaths(path);

  // Do not populate
  const queryBuilder = new PageQueryBuilder(this.find());
  const _ancestors: IPage[] = await queryBuilder
    .addConditionToListByPathsArray(ancestorPaths)
    .addConditionToSortAncestorPages()
    .query
    .lean()
    .exec();

  // no same path pages
  const ancestorsMap: Map<string, IPage> = new Map();
  _ancestors.forEach(page => ancestorsMap.set(page.path, page));
  const ancestors = Array.from(ancestorsMap.values());

  return ancestors;
};


/*
 * Merge obsolete page model methods and define new methods which depend on crowi instance
 */
export default (crowi: Crowi): any => {
  // add old page schema methods
  const pageSchema = getPageSchema(crowi);
  schema.methods = { ...pageSchema.methods, ...schema.methods };
  schema.statics = { ...pageSchema.statics, ...schema.statics };

  return getOrCreateModel<PageDocument, PageModel>('Page', schema);
};
