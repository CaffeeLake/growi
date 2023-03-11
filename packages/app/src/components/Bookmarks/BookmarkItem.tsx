import React, { useCallback, useEffect, useState } from 'react';

import nodePath from 'path';

import { DevidedPagePath, pathUtils } from '@growi/core';
import { useTranslation } from 'react-i18next';
import { UncontrolledTooltip, DropdownToggle } from 'reactstrap';

import { unbookmark } from '~/client/services/page-operation';
import { renamePage } from '~/client/util/bookmark-utils';
import { ValidationTarget } from '~/client/util/input-validator';
import { toastError, toastSuccess } from '~/client/util/toastr';
import { BookmarkFolderItems, DragItemDataType, DRAG_ITEM_TYPE } from '~/interfaces/bookmark-info';
import { IPageHasId, IPageInfoAll, IPageToDeleteWithMeta } from '~/interfaces/page';
import { useSWRxBookamrkFolderAndChild } from '~/stores/bookmark-folder';
import { useSWRxPageInfo } from '~/stores/page';

import ClosableTextInput from '../Common/ClosableTextInput';
import { MenuItemType, PageItemControl } from '../Common/Dropdown/PageItemControl';
import { PageListItemS } from '../PageList/PageListItemS';

import { DragAndDropWrapper } from './DragAndDropWrapper';

type Props = {
  bookmarkedPage: IPageHasId,
  onUnbookmarked: () => void,
  onRenamed: () => void,
  onClickDeleteMenuItem: (pageToDelete: IPageToDeleteWithMeta) => void,
  parentFolder: BookmarkFolderItems | null
}

export const BookmarkItem = (props: Props): JSX.Element => {
  const { t } = useTranslation();
  const {
    bookmarkedPage, onUnbookmarked, onRenamed, onClickDeleteMenuItem, parentFolder,
  } = props;
  const [isRenameInputShown, setRenameInputShown] = useState(false);
  const dPagePath = new DevidedPagePath(bookmarkedPage.path, false, true);
  const { latter: pageTitle, former: formerPagePath } = dPagePath;
  const bookmarkItemId = `bookmark-item-${bookmarkedPage._id}`;
  const { mutate: mutateBookamrkData } = useSWRxBookamrkFolderAndChild();
  const { data: fetchedPageInfo } = useSWRxPageInfo(bookmarkedPage._id);

  const dragItem: Partial<DragItemDataType> = {
    ...bookmarkedPage, parentFolder,
  };

  useEffect(() => {
    mutateBookamrkData();
  }, [mutateBookamrkData]);

  const bookmarkMenuItemClickHandler = useCallback(async() => {
    await unbookmark(bookmarkedPage._id);
    onUnbookmarked();
  }, [onUnbookmarked, bookmarkedPage]);

  const renameMenuItemClickHandler = useCallback(() => {
    setRenameInputShown(true);
  }, []);


  const pressEnterForRenameHandler = useCallback(async(inputText: string) => {
    const parentPath = pathUtils.addTrailingSlash(nodePath.dirname(bookmarkedPage.path ?? ''));
    const newPagePath = nodePath.resolve(parentPath, inputText);
    if (newPagePath === bookmarkedPage.path) {
      setRenameInputShown(false);
      return;
    }

    try {
      setRenameInputShown(false);
      await renamePage(bookmarkedPage._id, bookmarkedPage.revision, newPagePath);
      onRenamed();
      toastSuccess(t('renamed_pages', { path: bookmarkedPage.path }));
    }
    catch (err) {
      setRenameInputShown(true);
      toastError(err);
    }
  }, [bookmarkedPage, onRenamed, t]);

  const deleteMenuItemClickHandler = useCallback(async(_pageId: string, pageInfo: IPageInfoAll | undefined): Promise<void> => {
    if (bookmarkedPage._id == null || bookmarkedPage.path == null) {
      throw Error('_id and path must not be null.');
    }

    const pageToDelete: IPageToDeleteWithMeta = {
      data: {
        _id: bookmarkedPage._id,
        revision: bookmarkedPage.revision as string,
        path: bookmarkedPage.path,
      },
      meta: pageInfo,
    };

    onClickDeleteMenuItem(pageToDelete);
  }, [bookmarkedPage, onClickDeleteMenuItem]);

  return (
    <DragAndDropWrapper
      item={dragItem}
      type={[DRAG_ITEM_TYPE.BOOKMARK]}
      useDragMode={true}
    >
      <li
        className="bookmark-item-list list-group-item list-group-item-action border-0 py-0 mr-auto d-flex align-items-center"
        key={bookmarkedPage._id}
        id={bookmarkItemId}
      >
        { isRenameInputShown ? (
          <ClosableTextInput
            value={nodePath.basename(bookmarkedPage.path ?? '')}
            placeholder={t('Input page name')}
            onClickOutside={() => { setRenameInputShown(false) }}
            onPressEnter={pressEnterForRenameHandler}
            validationTarget={ValidationTarget.PAGE}
          />
        ) : <PageListItemS page={bookmarkedPage} pageTitle={pageTitle}/>}
        <div className='grw-foldertree-control'>
          <PageItemControl
            pageId={bookmarkedPage._id}
            isEnableActions
            pageInfo={fetchedPageInfo}
            forceHideMenuItems={[MenuItemType.DUPLICATE]}
            onClickBookmarkMenuItem={bookmarkMenuItemClickHandler}
            onClickRenameMenuItem={renameMenuItemClickHandler}
            onClickDeleteMenuItem={deleteMenuItemClickHandler}
          >
            <DropdownToggle color="transparent" className="border-0 rounded btn-page-item-control p-0 grw-visible-on-hover mr-1">
              <i className="icon-options fa fa-rotate-90 p-1"></i>
            </DropdownToggle>
          </PageItemControl>
        </div>
        <UncontrolledTooltip
          modifiers={{ preventOverflow: { boundariesElement: 'window' } }}
          autohide={false}
          placement="right"
          target={bookmarkItemId}
          fade={false}
        >
          {formerPagePath !== null ? `${formerPagePath}/` : '/'}
        </UncontrolledTooltip>
      </li>
    </DragAndDropWrapper>
  );
};
