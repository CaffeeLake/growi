import mongoose from 'mongoose';
import { describe } from 'yargs';

import { getInstance } from '../setup-crowi';

describe('Page', () => {
  let crowi;
  let Page;
  let Revision;
  let User;
  let Tag;
  let PageTagRelation;
  let Bookmark;
  let Comment;
  let ShareLink;
  let PageRedirect;
  let xssSpy;

  let rootPage;
  let dummyUser1;

  // pass unless the data is one of [false, 0, '', null, undefined, NaN]
  const expectAllToBeTruthy = (dataList) => {
    dataList.forEach((data, i) => {
      if (data == null) { console.log(`index: ${i}`) }
      expect(data).toBeTruthy();
    });
  };

  beforeAll(async() => {
    crowi = await getInstance();
    await crowi.configManager.updateConfigsInTheSameNamespace('crowi', { 'app:isV5Compatible': true });

    jest.restoreAllMocks();
    User = mongoose.model('User');
    Page = mongoose.model('Page');
    Revision = mongoose.model('Revision');
    Tag = mongoose.model('Tag');
    PageTagRelation = mongoose.model('PageTagRelation');
    Bookmark = mongoose.model('Bookmark');
    Comment = mongoose.model('Comment');
    ShareLink = mongoose.model('ShareLink');
    PageRedirect = mongoose.model('PageRedirect');

    dummyUser1 = await User.findOne({ username: 'v5DummyUser1' });

    rootPage = await Page.findOne({ path: '/' });

    const createPageId1 = new mongoose.Types.ObjectId();

    await Page.insertMany([
      {
        _id: createPageId1,
        path: '/v5_empty_create_4',
        grant: Page.GRANT_PUBLIC,
        parent: rootPage._id,
        isEmpty: true,
      },
      {
        path: '/v5_empty_create_4/v5_create_5',
        grant: Page.GRANT_PUBLIC,
        creator: dummyUser1,
        lastUpdateUser: dummyUser1._id,
        parent: createPageId1,
      },
    ]);

    /**
     * update
     * mup_ => model update
     */
    const pageIdUpd1 = new mongoose.Types.ObjectId();
    const pageIdUpd2 = new mongoose.Types.ObjectId();
    const pageIdUpd3 = new mongoose.Types.ObjectId();

    const revisionIdUpd2 = new mongoose.Types.ObjectId();

    await Page.insertMany([
      {
        _id: pageIdUpd1,
        path: '/mup1_empty',
        grant: Page.GRANT_PUBLIC,
        parent: rootPage._id,
        isEmpty: true,
      },
      {
        _id: pageIdUpd2,
        path: '/mup1_empty/mup2_public',
        grant: Page.GRANT_PUBLIC,
        parent: pageIdUpd1._id,
        creator: dummyUser1,
        lastUpdateUser: dummyUser1._id,
        revision: revisionIdUpd2,
        isEmpty: false,
      },
      {
        _id: pageIdUpd3,
        path: '/mup3_empty/mup4_empty/mup5_link',
        grant: Page.GRANT_RESTRICTED,
        isEmpty: true,
      },
    ]);
    await Revision.insertMany([
      {
        _id: revisionIdUpd2,
        pageId: pageIdUpd2,
        format: 'markdown',
        body: '/mup1_empty/mup2_public',
      },
    ]);

  });
  describe('create', () => {

    test('Should create single page', async() => {
      const page = await Page.create('/v5_create1', 'create1', dummyUser1, {});
      expect(page).toBeTruthy();
      expect(page.parent).toStrictEqual(rootPage._id);
    });

    test('Should create empty-child and non-empty grandchild', async() => {
      const grandchildPage = await Page.create('/v5_empty_create2/v5_create_3', 'grandchild', dummyUser1, {});
      const childPage = await Page.findOne({ path: '/v5_empty_create2' });

      expect(childPage.isEmpty).toBe(true);
      expect(grandchildPage).toBeTruthy();
      expect(childPage).toBeTruthy();
      expect(childPage.parent).toStrictEqual(rootPage._id);
      expect(grandchildPage.parent).toStrictEqual(childPage._id);
    });

    test('Should create on empty page', async() => {
      const beforeCreatePage = await Page.findOne({ path: '/v5_empty_create_4' });
      expect(beforeCreatePage.isEmpty).toBe(true);

      const childPage = await Page.create('/v5_empty_create_4', 'body', dummyUser1, {});
      const grandchildPage = await Page.findOne({ parent: childPage._id });

      expect(childPage).toBeTruthy();
      expect(childPage.isEmpty).toBe(false);
      expect(childPage.revision.body).toBe('body');
      expect(grandchildPage).toBeTruthy();
      expect(childPage.parent).toStrictEqual(rootPage._id);
      expect(grandchildPage.parent).toStrictEqual(childPage._id);
    });

    describe('Creating a page using existing path', () => {
      test('with grant RESTRICTED should only create the page and change nothing else', () => {

      });
    });
    describe('Creating a page under a page with grant RESTRICTED', () => {
      test('should create an new empty page with the same path as the grant RESTRECTED page', async() => {

      });
    });

  });

  describe('update', () => {

    describe('Changing grant from PUBLIC to RESTRICTED of', () => {
      test('an only-child page will delete its empty parent page', async() => {
        const page1 = await Page.findOne({ path: '/mup1_empty', isEmpty: true });
        const page2 = await Page.findOne({ path: '/mup1_empty/mup2_public' }).populate({ path: 'revision', model: 'Revision' });
        const revision = page2.revision;
        const newBody = 'newBody';
        const options = { isSyncRevisionToHackmd: false, grant: 2, grantUserGroupId: null };
        expectAllToBeTruthy([page1, page2, revision]);

        await Page.updatePage(page2, newBody, revision.body, dummyUser1, options);
        // AU => After Update
        const page1AU = await Page.findOne({ path: '/mup1_empty', isEmpty: true });
        const page2AU = await Page.findOne({ path: '/mup1_empty/mup2_public' }).populate({ path: 'revision', model: 'Revision' });

        expect(page2AU).toBeTruthy();
        expect(page1AU).toBeNull();
      });
      test('a page that has children will create an empty page with the same path and it becomes a new parent', async() => {});
      test('of a leaf page will NOT have empty page with the same path', async() => {});
    });
    describe('Changing grant from RESTRICTED to PUBLIC of', () => {
      test('a page with no ancestors will create ancestors with isEmpty: true', async() => {});
      test('a page will replace an empty page with the same path if any', async() => {});
    });


  });
});
