import React, { FC, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { IPageHasId } from '../../../interfaces/page';
import { ItemNode } from './ItemNode';
import Item from './Item';
import { useSWRxPageAncestorsChildren, useSWRxPageChildren, useSWRxRootPage } from '../../../stores/page-listing';
import { TargetAndAncestors } from '~/interfaces/page-listing-results';
import { toastError, toastSuccess } from '~/client/util/apiNotification';
import {
  OnDeletedFunction, IPageForPageDeleteModal, usePageDuplicateModal, usePageRenameModal, usePageDeleteModal,
} from '~/stores/modal';
import { smoothScrollIntoView } from '~/client/util/smooth-scroll';

/*
 * Utility to generate initial node
 */
const generateInitialNodeBeforeResponse = (targetAndAncestors: Partial<IPageHasId>[]): ItemNode => {
  const nodes = targetAndAncestors.map((page): ItemNode => {
    return new ItemNode(page, []);
  });

  // update children for each node
  const rootNode = nodes.reduce((child, parent) => {
    parent.children = [child];
    return parent;
  });

  return rootNode;
};

const generateInitialNodeAfterResponse = (ancestorsChildren: Record<string, Partial<IPageHasId>[]>, rootNode: ItemNode): ItemNode => {
  const paths = Object.keys(ancestorsChildren);

  let currentNode = rootNode;
  paths.every((path) => {
    // stop rendering when non-migrated pages found
    if (currentNode == null) {
      return false;
    }

    const childPages = ancestorsChildren[path];
    currentNode.children = ItemNode.generateNodesFromPages(childPages);
    const nextNode = currentNode.children.filter((node) => {
      return paths.includes(node.page.path as string);
    })[0];
    currentNode = nextNode;
    return true;
  });

  return rootNode;
};

type ItemsTreeProps = {
  isEnableActions: boolean
  targetPath: string
  targetPathOrId?: string
  targetAndAncestorsData?: TargetAndAncestors
}

const renderByInitialNode = (
    initialNode: ItemNode,
    isEnableActions: boolean,
    targetPathOrId?: string,
    onClickDuplicateMenuItem?: (pageId: string, path: string) => void,
    onClickRenameMenuItem?: (pageId: string, revisionId: string, path: string) => void,
    onClickDeleteMenuItem?: (pageToDelete: IPageForPageDeleteModal | null, isAbleToDeleteCompletely: boolean) => void,
): JSX.Element => {

  return (
    <ul className="grw-pagetree list-group p-3">
      <Item
        key={initialNode.page.path}
        targetPathOrId={targetPathOrId}
        itemNode={initialNode}
        isOpen
        isEnableActions={isEnableActions}
        onClickDuplicateMenuItem={onClickDuplicateMenuItem}
        onClickRenameMenuItem={onClickRenameMenuItem}
        onClickDeleteMenuItem={onClickDeleteMenuItem}
      />
    </ul>
  );
};

// --- Auto scroll related utils and vars ---

const SCROLL_OFFSET_TOP = 60; // approximate height of (navigation + page tree's header)
const MUTATION_OBSERVER_CONFIG = { childList: true, subtree: true };

const mutationObserverCallback = (mutationRecords : MutationRecord[], mutationObserver: MutationObserver) => {
  const scrollElement = document.getElementById('grw-sidebar-contents-scroll-target');
  if (scrollElement == null) return;
  mutationRecords.forEach((record) => {
    const elem = record.target as HTMLElement;
    const target = elem.querySelector('li.grw-pagetree-is-target');
    if (target != null) {
      if (elem.contains(target)) {
        smoothScrollIntoView(target as HTMLElement, SCROLL_OFFSET_TOP, scrollElement as HTMLElement);
        mutationObserver.disconnect();
      }
    }
  });
};
// --- end ---


/*
 * ItemsTree
 */
const ItemsTree: FC<ItemsTreeProps> = (props: ItemsTreeProps) => {
  const {
    targetPath, targetPathOrId, targetAndAncestorsData, isEnableActions,
  } = props;

  const { t } = useTranslation();

  const { data: ancestorsChildrenData, error: error1 } = useSWRxPageAncestorsChildren(targetPath);
  const { mutate: mutateChildren } = useSWRxPageChildren(targetPathOrId);
  const { data: rootPageData, error: error2 } = useSWRxRootPage();
  const { open: openDuplicateModal } = usePageDuplicateModal();
  const { open: openRenameModal } = usePageRenameModal();
  const { open: openDeleteModal } = usePageDeleteModal();

  // ***************************  Auto Scroll  ***************************

  useEffect(() => {
    const elementToObserve = document.querySelector('ul.grw-pagetree');
    if (elementToObserve == null) {
      return;
    }
    const observer = new MutationObserver(mutationObserverCallback);
    observer.observe(elementToObserve, MUTATION_OBSERVER_CONFIG);
    // component did unmount
    return () => {
      observer.disconnect();
    };
  }, []);

  // *******************************  end  *******************************

  const onClickDuplicateMenuItem = (pageId: string, path: string) => {
    openDuplicateModal(pageId, path);
  };

  const onClickRenameMenuItem = (pageId: string, revisionId: string, path: string) => {
    openRenameModal(pageId, revisionId, path);
  };

  const onDeletedHandler: OnDeletedFunction = (pathOrPathsToDelete, isRecursively, isCompletely) => {
    if (typeof pathOrPathsToDelete !== 'string') {
      return;
    }

    mutateChildren();

    const path = pathOrPathsToDelete;

    if (isRecursively) {
      if (isCompletely) {
        toastSuccess(t('deleted_single_page_recursively_completely', { path }));
      }
      else {
        toastSuccess(t('deleted_single_page_recursively', { path }));
      }
    }
    else {
      // eslint-disable-next-line no-lonely-if
      if (isCompletely) {
        toastSuccess(t('deleted_single_page_completely', { path }));
      }
      else {
        toastSuccess(t('deleted_single_page', { path }));
      }
    }
  };

  const onClickDeleteMenuItem = (pageToDelete: IPageForPageDeleteModal, isAbleToDeleteCompletely) => {
    openDeleteModal([pageToDelete], onDeletedHandler, isAbleToDeleteCompletely);
  };

  if (error1 != null || error2 != null) {
    // TODO: improve message
    toastError('Error occurred while fetching pages to render PageTree');
    return null;
  }

  /*
   * Render completely
   */
  if (ancestorsChildrenData != null && rootPageData != null) {
    const initialNode = generateInitialNodeAfterResponse(ancestorsChildrenData.ancestorsChildren, new ItemNode(rootPageData.rootPage));
    return renderByInitialNode(initialNode, isEnableActions, targetPathOrId, onClickDuplicateMenuItem, onClickRenameMenuItem, onClickDeleteMenuItem);
  }

  /*
   * Before swr response comes back
   */
  if (targetAndAncestorsData != null) {
    const initialNode = generateInitialNodeBeforeResponse(targetAndAncestorsData.targetAndAncestors);
    return renderByInitialNode(initialNode, isEnableActions, targetPathOrId, onClickDuplicateMenuItem, onClickRenameMenuItem, onClickDeleteMenuItem);
  }

  return null;
};

export default ItemsTree;
