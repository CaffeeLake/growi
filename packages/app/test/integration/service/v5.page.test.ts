/* eslint-disable no-unused-vars */
import { advanceTo } from 'jest-date-mock';

import mongoose from 'mongoose';

import { getInstance } from '../setup-crowi';

describe('PageService page operations with only public pages', () => {

  let dummyUser1;
  let dummyUser2;

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

  // pass unless the data is one of [false, 0, '', null, undefined, NaN]
  const expectAllToBeTruthy = (dataList) => {
    dataList.forEach((data) => {
      expect(data).toBeTruthy();
    });
  };

  beforeAll(async() => {
    crowi = await getInstance();
    await crowi.configManager.updateConfigsInTheSameNamespace('crowi', { 'app:isV5Compatible': true });

    User = mongoose.model('User');
    Page = mongoose.model('Page');
    Revision = mongoose.model('Revision');
    Tag = mongoose.model('Tag');
    PageTagRelation = mongoose.model('PageTagRelation');
    Bookmark = mongoose.model('Bookmark');
    Comment = mongoose.model('Comment');
    ShareLink = mongoose.model('ShareLink');
    PageRedirect = mongoose.model('PageRedirect');

    /*
     * Common
     */
    await User.insertMany([
      { name: 'v5DummyUser1', username: 'v5DummyUser1', email: 'v5DummyUser1@example.com' },
      { name: 'v5DummyUser2', username: 'v5DummyUser2', email: 'v5DummyUser2@example.com' },
    ]);

    dummyUser1 = await User.findOne({ username: 'v5DummyUser1' });
    if (dummyUser1 == null) {
      dummyUser1 = await User.create({ name: 'v5DummyUser1', username: 'v5DummyUser1', email: 'v5DummyUser1@example.com' });
    }
    dummyUser2 = await User.findOne({ username: 'v5DummyUser2' });
    if (dummyUser2 == null) {
      dummyUser2 = await User.create({ name: 'v5DummyUser2', username: 'v5DummyUser2', email: 'v5DummyUser2@example.com' });
    }

    xssSpy = jest.spyOn(crowi.xss, 'process').mockImplementation(path => path);

    rootPage = await Page.findOne({ path: '/' });
    if (rootPage == null) {
      const pages = await Page.insertMany([{ path: '/', grant: Page.GRANT_PUBLIC }]);
      rootPage = pages[0];
    }

    /*
     * Rename
     */
    const pageIdForRename1 = new mongoose.Types.ObjectId();
    const pageIdForRename2 = new mongoose.Types.ObjectId();
    const pageIdForRename3 = new mongoose.Types.ObjectId();
    const pageIdForRename4 = new mongoose.Types.ObjectId();
    const pageIdForRename5 = new mongoose.Types.ObjectId();

    const pageIdForRename7 = new mongoose.Types.ObjectId();
    const pageIdForRename8 = new mongoose.Types.ObjectId();
    const pageIdForRename9 = new mongoose.Types.ObjectId();
    const pageIdForRename10 = new mongoose.Types.ObjectId();
    const pageIdForRename11 = new mongoose.Types.ObjectId();
    const pageIdForRename12 = new mongoose.Types.ObjectId();
    const pageIdForRename13 = new mongoose.Types.ObjectId();
    const pageIdForRename14 = new mongoose.Types.ObjectId();

    const pageIdForRename16 = new mongoose.Types.ObjectId();

    // Create Pages
    await Page.insertMany([
      // parents
      {
        _id: pageIdForRename1,
        path: '/v5_ParentForRename1',
        grant: Page.GRANT_PUBLIC,
        creator: dummyUser1,
        lastUpdateUser: dummyUser1._id,
        parent: rootPage._id,
      },
      {
        _id: pageIdForRename2,
        path: '/v5_ParentForRename2',
        grant: Page.GRANT_PUBLIC,
        parent: rootPage._id,
        isEmpty: true,
      },
      {
        // id not needed for this data
        path: '/v5_ParentForRename2/dummyChild1',
        grant: Page.GRANT_PUBLIC,
        creator: dummyUser1,
        lastUpdateUser: dummyUser1._id,
        parent: pageIdForRename2,
      },
      {
        _id: pageIdForRename3,
        path: '/v5_ParentForRename3',
        grant: Page.GRANT_PUBLIC,
        creator: dummyUser1,
        lastUpdateUser: dummyUser1._id,
        parent: rootPage._id,
      },
      {
        _id: pageIdForRename4,
        path: '/v5_ParentForRename4',
        grant: Page.GRANT_PUBLIC,
        creator: dummyUser1,
        lastUpdateUser: dummyUser1._id,
        parent: rootPage._id,
      },
      {
        _id: pageIdForRename5,
        path: '/v5_ParentForRename5',
        grant: Page.GRANT_PUBLIC,
        creator: dummyUser1,
        lastUpdateUser: dummyUser1._id,
        parent: rootPage._id,
      },
      {
        _id: pageIdForRename7,
        path: '/v5_ParentForRename7',
        grant: Page.GRANT_PUBLIC,
        creator: dummyUser1,
        lastUpdateUser: dummyUser1._id,
        parent: rootPage._id,
      },
      {
        _id: pageIdForRename8,
        path: '/v5_ParentForRename8',
        grant: Page.GRANT_PUBLIC,
        creator: dummyUser1,
        lastUpdateUser: dummyUser1._id,
        parent: rootPage._id,
      },
      {
        _id: pageIdForRename9,
        path: '/v5_ParentForRename9',
        grant: Page.GRANT_PUBLIC,
        creator: dummyUser1,
        lastUpdateUser: dummyUser1._id,
        parent: rootPage._id,
      },
      // children
      {
        _id: pageIdForRename10,
        path: '/v5_ChildForRename1',
        grant: Page.GRANT_PUBLIC,
        creator: dummyUser1,
        lastUpdateUser: dummyUser1._id,
        parent: rootPage._id,
      },
      {
        _id: pageIdForRename11,
        path: '/v5_ChildForRename2',
        grant: Page.GRANT_PUBLIC,
        creator: dummyUser1,
        lastUpdateUser: dummyUser1._id,
        parent: rootPage._id,
      },
      {
        _id: pageIdForRename12,
        path: '/v5_ChildForRename3',
        grant: Page.GRANT_PUBLIC,
        creator: dummyUser1,
        lastUpdateUser: dummyUser1._id,
        parent: rootPage._id,
        updatedAt: new Date('2021'),
      },
      {
        _id: pageIdForRename13,
        path: '/v5_ChildForRename4',
        grant: Page.GRANT_PUBLIC,
        creator: dummyUser1,
        lastUpdateUser: dummyUser1._id,
        parent: rootPage._id,
      },
      {
        _id: pageIdForRename14,
        path: '/v5_ChildForRename5',
        grant: Page.GRANT_PUBLIC,
        creator: dummyUser1,
        lastUpdateUser: dummyUser1._id,
        parent: rootPage._id,
      },
      {
        _id: pageIdForRename16,
        path: '/v5_ChildForRename7',
        grant: Page.GRANT_PUBLIC,
        parent: rootPage._id,
        isEmpty: true,
      },
      // Grandchild
      {
        path: '/v5_ChildForRename5/v5_GrandchildForRename5',
        grant: Page.GRANT_PUBLIC,
        creator: dummyUser1,
        lastUpdateUser: dummyUser1._id,
        parent: pageIdForRename14,
        updatedAt: new Date('2021'),
      },
      {
        path: '/v5_ChildForRename7/v5_GrandchildForRename7',
        grant: Page.GRANT_PUBLIC,
        creator: dummyUser1,
        lastUpdateUser: dummyUser1._id,
        parent: pageIdForRename16,
      },
    ]);

    /**
     * Delete
     */
    const pageIdForDelete1 = new mongoose.Types.ObjectId();
    const pageIdForDelete2 = new mongoose.Types.ObjectId();
    const pageIdForDelete3 = new mongoose.Types.ObjectId();
    const pageIdForDelete4 = new mongoose.Types.ObjectId();
    const pageIdForDelete5 = new mongoose.Types.ObjectId();

    await Page.insertMany([
      {
        path: '/trash/v5_PageForDelete1',
        grant: Page.GRANT_PUBLIC,
        creator: dummyUser1,
        lastUpdateUser: dummyUser1._id,
        status: Page.STATUS_DELETED,
      },
      {
        path: '/v5_PageForDelete2',
        grant: Page.GRANT_PUBLIC,
        creator: dummyUser1,
        lastUpdateUser: dummyUser1._id,
        parent: rootPage._id,
        status: Page.STATUS_PUBLISHED,
      },
      {
        _id: pageIdForDelete1,
        path: '/v5_PageForDelete3',
        grant: Page.GRANT_PUBLIC,
        creator: dummyUser1,
        lastUpdateUser: dummyUser1._id,
        parent: rootPage._id,
        status: Page.STATUS_PUBLISHED,
      },
      {
        _id: pageIdForDelete2,
        path: '/v5_PageForDelete3/v5_PageForDelete4',
        grant: Page.GRANT_PUBLIC,
        parent: pageIdForDelete1,
        status: Page.STATUS_PUBLISHED,
        isEmpty: true,
      },
      {
        path: '/v5_PageForDelete3/v5_PageForDelete4/v5_PageForDelete5',
        grant: Page.GRANT_PUBLIC,
        creator: dummyUser1,
        lastUpdateUser: dummyUser1._id,
        parent: pageIdForDelete2,
        status: Page.STATUS_PUBLISHED,
      },
      {
        _id: pageIdForDelete3,
        path: '/v5_PageForDelete6',
        grant: Page.GRANT_PUBLIC,
        creator: dummyUser1,
        lastUpdateUser: dummyUser1._id,
        parent: rootPage._id,
        status: Page.STATUS_PUBLISHED,
      },
      {
        _id: pageIdForDelete4,
        path: '/user',
        grant: Page.GRANT_PUBLIC,
        parent: rootPage._id,
        status: Page.STATUS_PUBLISHED,
        isEmpty: true,
      },
      {
        _id: pageIdForDelete5,
        path: '/user/v5DummyUser1',
        grant: Page.GRANT_PUBLIC,
        creator: dummyUser1,
        lastUpdateUser: dummyUser1._id,
        parent: pageIdForDelete4,
        status: Page.STATUS_PUBLISHED,
      },
    ]);

    const tagIdForDelete1 = new mongoose.Types.ObjectId();
    const tagIdForDelete2 = new mongoose.Types.ObjectId();

    await Tag.insertMany([
      { _id: tagIdForDelete1, name: 'TagForDelete1' },
      { _id: tagIdForDelete2, name: 'TagForDelete2' },
    ]);

    await PageTagRelation.insertMany([
      { relatedPage: pageIdForDelete3, relatedTag: tagIdForDelete1 },
      { relatedPage: pageIdForDelete3, relatedTag: tagIdForDelete2 },
    ]);
  });

  describe('Rename', () => {

    const renamePage = async(page, newPagePath, user, options) => {
    // mock return value
      const mockedResumableRenameDescendants = jest.spyOn(crowi.pageService, 'resumableRenameDescendants').mockReturnValue(null);
      const mockedCreateAndSendNotifications = jest.spyOn(crowi.pageService, 'createAndSendNotifications').mockReturnValue(null);
      const renamedPage = await crowi.pageService.renamePage(page, newPagePath, user, options);

      // retrieve the arguments passed when calling method resumableRenameDescendants inside renamePage method
      const argsForResumableRenameDescendants = mockedResumableRenameDescendants.mock.calls[0];

      // restores the original implementation
      mockedResumableRenameDescendants.mockRestore();
      mockedCreateAndSendNotifications.mockRestore();

      // rename descendants
      await crowi.pageService.resumableRenameDescendants(...argsForResumableRenameDescendants);

      return renamedPage;
    };

    test('Should NOT rename top page', async() => {
      expectAllToBeTruthy([rootPage]);
      let isThrown = false;
      try {
        await crowi.pageService.renamePage(rootPage, '/new_root', dummyUser1, {});
      }
      catch (err) {
        isThrown = true;
      }

      expect(isThrown).toBe(true);
    });

    test('Should rename/move to under non-empty page', async() => {
      const parentPage = await Page.findOne({ path: '/v5_ParentForRename1' });
      const childPage = await Page.findOne({ path: '/v5_ChildForRename1' });
      expectAllToBeTruthy([childPage, parentPage]);

      const newPath = '/v5_ParentForRename1/renamedChildForRename1';
      const renamedPage = await renamePage(childPage, newPath, dummyUser1, {});
      const childPageBeforeRename = await Page.findOne({ path: '/v5_ChildForRename1' });

      expect(xssSpy).toHaveBeenCalled();
      expect(renamedPage.path).toBe(newPath);
      expect(renamedPage.parent).toStrictEqual(parentPage._id);
      expect(childPageBeforeRename).toBeNull();

    });

    test('Should rename/move to under empty page', async() => {
      const parentPage = await Page.findOne({ path: '/v5_ParentForRename2' });
      const childPage = await Page.findOne({ path: '/v5_ChildForRename2' });
      expectAllToBeTruthy([childPage, parentPage]);
      expect(parentPage.isEmpty).toBe(true);

      const newPath = '/v5_ParentForRename2/renamedChildForRename2';
      const renamedPage = await renamePage(childPage, newPath, dummyUser1, {});
      const childPageBeforeRename = await Page.findOne({ path: '/v5_ChildForRename2' });

      expect(xssSpy).toHaveBeenCalled();
      expect(renamedPage.path).toBe(newPath);
      expect(parentPage.isEmpty).toBe(true);
      expect(renamedPage.parent).toStrictEqual(parentPage._id);
      expect(childPageBeforeRename).toBeNull();
    });

    test('Should rename/move with option updateMetadata: true', async() => {
      const parentPage = await Page.findOne({ path: '/v5_ParentForRename3' });
      const childPage = await Page.findOne({ path: '/v5_ChildForRename3' });
      expectAllToBeTruthy([childPage, parentPage]);
      expect(childPage.lastUpdateUser).toStrictEqual(dummyUser1._id);

      const newPath = '/v5_ParentForRename3/renamedChildForRename3';
      const oldUdpateAt = childPage.updatedAt;
      const renamedPage = await renamePage(childPage, newPath, dummyUser2, { updateMetadata: true });

      expect(xssSpy).toHaveBeenCalled();
      expect(renamedPage.path).toBe(newPath);
      expect(renamedPage.parent).toStrictEqual(parentPage._id);
      expect(renamedPage.lastUpdateUser).toStrictEqual(dummyUser2._id);
      expect(renamedPage.updatedAt.getFullYear()).toBeGreaterThan(oldUdpateAt.getFullYear());
    });

    // ****************** TODO ******************
    // uncomment the next test when working on 88097
    // ******************************************
    // test('Should move with option createRedirectPage: true', async() => {
    // const parentPage = await Page.findOne({ path: '/v5_ParentForRename4' });
    // const childPage = await Page.findOne({ path: '/v5_ChildForRename4' });
    // expectAllToBeTruthy([parentPage, childPage]);

    //   // rename target page
    //   const newPath = '/v5_ParentForRename4/renamedChildForRename4';
    //   const renamedPage = await renamePage(childPage, newPath, dummyUser2, { createRedirectPage: true });
    //   const pageRedirect = await PageRedirect.find({ fromPath: childPage.path, toPath: renamedPage.path });

    // expect(xssSpy).toHaveBeenCalled();
    //   expect(renamedPage.path).toBe(newPath);
    //   expect(renamedPage.parent).toStrictEqual(parentPage._id);
    //   expect(pageRedirect.length).toBeGreaterThan(0);
    // });

    test('Should rename/move with descendants', async() => {
      const parentPage = await Page.findOne({ path: '/v5_ParentForRename5' });
      const childPage = await Page.findOne({ path: '/v5_ChildForRename5' });
      const grandchild = await Page.findOne({ parent: childPage._id, path: '/v5_ChildForRename5/v5_GrandchildForRename5' });

      expectAllToBeTruthy([parentPage, childPage, grandchild]);

      const newPath = '/v5_ParentForRename5/renamedChildForRename5';
      const renamedPage = await renamePage(childPage, newPath, dummyUser1, {});
      // find child of renamed page
      const renamedGrandchild = await Page.findOne({ parent: renamedPage._id });
      const childPageBeforeRename = await Page.findOne({ path: '/v5_ChildForRename5' });
      const grandchildBeforeRename = await Page.findOne({ path: grandchild.path });

      expect(xssSpy).toHaveBeenCalled();
      expect(renamedPage.path).toBe(newPath);
      expect(renamedPage.parent).toStrictEqual(parentPage._id);
      expect(childPageBeforeRename).toBeNull();
      expect(grandchildBeforeRename).toBeNull();
      // grandchild's parent should be the renamed page
      expect(renamedGrandchild.parent).toStrictEqual(renamedPage._id);
      expect(renamedGrandchild.path).toBe('/v5_ParentForRename5/renamedChildForRename5/v5_GrandchildForRename5');
    });

    test('Should rename/move empty page', async() => {
      const parentPage = await Page.findOne({ path: '/v5_ParentForRename7' });
      const childPage = await Page.findOne({ path: '/v5_ChildForRename7', isEmpty: true });
      const grandchild = await Page.findOne({ parent: childPage._id, path: '/v5_ChildForRename7/v5_GrandchildForRename7' });

      expectAllToBeTruthy([parentPage, childPage, grandchild]);

      const newPath = '/v5_ParentForRename7/renamedChildForRename7';
      const renamedPage = await renamePage(childPage, newPath, dummyUser1, {});
      const grandchildAfterRename = await Page.findOne({ parent: renamedPage._id });
      const grandchildBeforeRename = await Page.findOne({ path: '/v5_ChildForRename7/v5_GrandchildForRename7' });

      expect(xssSpy).toHaveBeenCalled();
      expect(renamedPage.path).toBe(newPath);
      expect(renamedPage.isEmpty).toBe(true);
      expect(renamedPage.parent).toStrictEqual(parentPage._id);
      expect(grandchildBeforeRename).toBeNull();
      // grandchild's parent should be renamed page
      expect(grandchildAfterRename.parent).toStrictEqual(renamedPage._id);
      expect(grandchildAfterRename.path).toBe('/v5_ParentForRename7/renamedChildForRename7/v5_GrandchildForRename7');
    });
    test('Should NOT rename/move with existing path', async() => {
      const page = await Page.findOne({ path: '/v5_ParentForRename8' });
      expectAllToBeTruthy([page]);

      const newPath = '/v5_ParentForRename9';
      let isThrown;
      try {
        await renamePage(page, newPath, dummyUser1, {});
      }
      catch (err) {
        isThrown = true;
      }

      expect(isThrown).toBe(true);
    });
  });
  describe('Delete', () => {
    const deletePage = async(page, user, options, isRecursively) => {
      const mockedResumableDeleteDescendants = jest.spyOn(crowi.pageService, 'resumableDeleteDescendants').mockReturnValue(null);
      const mockedCreateAndSendNotifications = jest.spyOn(crowi.pageService, 'createAndSendNotifications').mockReturnValue(null);

      const deletedPage = await crowi.pageService.deletePage(page, user, options, isRecursively);

      const argsForResumableDeleteDescendants = mockedResumableDeleteDescendants.mock.calls[0];

      mockedResumableDeleteDescendants.mockRestore();
      mockedCreateAndSendNotifications.mockRestore();

      if (isRecursively) {
        await crowi.pageService.resumableDeleteDescendants(...argsForResumableDeleteDescendants);
      }

      return deletedPage;
    };

    test('Should NOT delete root page', async() => {
      let isThrown;
      expectAllToBeTruthy([rootPage]);

      try { await deletePage(rootPage, dummyUser1, {}, false) }
      catch (err) { isThrown = true }

      const page = await Page.findOne({ path: '/' });

      expect(isThrown).toBe(true);
      expect(page).toBeTruthy();
    });

    test('Should NOT delete trashed page', async() => {
      const trashedPage = await Page.findOne({ path: '/trash/v5_PageForDelete1' });
      expectAllToBeTruthy([trashedPage]);

      let isThrown;
      try { await deletePage(trashedPage, dummyUser1, {}, false) }
      catch (err) { isThrown = true }

      const page = await Page.findOne({ path: '/trash/v5_PageForDelete1' });

      expect(page).toBeTruthy();
      expect(isThrown).toBe(true);
    });

    test('Should NOT delete /user/hoge page', async() => {
      const dummyUser1Page = await Page.findOne({ path: '/user/v5DummyUser1' });
      expectAllToBeTruthy([dummyUser1Page]);

      let isThrown;
      try { await deletePage(dummyUser1Page, dummyUser1, {}, false) }
      catch (err) { isThrown = true }

      const page = await Page.findOne({ path: '/user/v5DummyUser1' });

      expect(page).toBeTruthy();
      expect(isThrown).toBe(true);
    });

    test('Should delete single page', async() => {
      const pageToDelete = await Page.findOne({ path: '/v5_PageForDelete2' });
      expectAllToBeTruthy([pageToDelete]);

      const deletedPage = await deletePage(pageToDelete, dummyUser1, {}, false);
      const page = await Page.findOne({ path: '/v5_PageForDelete2' });

      expect(page).toBeNull();
      expect(deletedPage.path).toBe(`/trash${pageToDelete.path}`);
      expect(deletedPage.parent).toBeNull();
      expect(deletedPage.status).toBe(Page.STATUS_DELETED);
    });

    test('Should delete multiple pages including empty child', async() => {
      const parentPage = await Page.findOne({ path: '/v5_PageForDelete3' });
      const childPage = await Page.findOne({ path: '/v5_PageForDelete3/v5_PageForDelete4' });
      const grandchildPage = await Page.findOne({ path: '/v5_PageForDelete3/v5_PageForDelete4/v5_PageForDelete5' });
      expectAllToBeTruthy([parentPage, childPage, grandchildPage]);

      const deletedParentPage = await deletePage(parentPage, dummyUser1, {}, true);
      const deletedChildPage = await Page.findOne({ path: '/trash/v5_PageForDelete3/v5_PageForDelete4' });
      const deletedGrandchildPage = await Page.findOne({ path: '/trash/v5_PageForDelete3/v5_PageForDelete4/v5_PageForDelete5' });

      // originally NOT empty page should exist with status 'deleted' and parent set null
      expect(deletedParentPage._id).toStrictEqual(parentPage._id);
      expect(deletedParentPage.status).toBe(Page.STATUS_DELETED);
      expect(deletedParentPage.parent).toBeNull();
      // originally empty page should NOT exist
      expect(deletedChildPage).toBeNull();
      // originally NOT empty page should exist with status 'deleted' and parent set null
      expect(deletedGrandchildPage._id).toStrictEqual(grandchildPage._id);
      expect(deletedGrandchildPage.status).toBe(Page.STATUS_DELETED);
      expect(deletedGrandchildPage.parent).toBeNull();
    });

    test('Should delete page tag relation', async() => {
      const pageToDelete = await Page.findOne({ path: '/v5_PageForDelete6' });
      const tag1 = await Tag.findOne({ name: 'TagForDelete1' });
      const tag2 = await Tag.findOne({ name: 'TagForDelete2' });
      const pageRelation1 = await PageTagRelation.findOne({ relatedTag: tag1._id });
      const pageRelation2 = await PageTagRelation.findOne({ relatedTag: tag2._id });
      expectAllToBeTruthy([pageToDelete, tag1, tag2, pageRelation1, pageRelation2]);

      const deletedPage = await deletePage(pageToDelete, dummyUser1, {}, false);
      const page = await Page.findOne({ path: '/v5_PageForDelete6' });
      const deletedTagRelation1 = await PageTagRelation.findOne({ _id: pageRelation1._id });
      const deletedTagRelation2 = await PageTagRelation.findOne({ _id: pageRelation2._id });

      expect(page).toBe(null);
      expect(deletedPage.status).toBe(Page.STATUS_DELETED);
      expect(deletedTagRelation1.isPageTrashed).toBe(true);
      expect(deletedTagRelation2.isPageTrashed).toBe(true);
    });
  });

});

describe('PageService page operations with non-public pages', () => {
  // TODO: write test code
});