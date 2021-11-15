import React, {
  FC, useCallback, useEffect, useRef, useState,
} from 'react';

import {
  useDrawerMode, useDrawerOpened,
  useSidebarCollapsed,
  useCurrentSidebarContents,
  useCurrentProductNavWidth,
  useSidebarResizeDisabled,
} from '~/stores/ui';

import DrawerToggler from './Navbar/DrawerToggler';

import SidebarNav from './Sidebar/SidebarNav';
import SidebarContents from './Sidebar/SidebarContents';
import { scheduleToPutUserUISettings } from '~/services/user-ui-settings';

const sidebarMinWidth = 240;
const sidebarMinimizeWidth = 20;

const GlobalNavigation = () => {
  const { data: currentContents } = useCurrentSidebarContents();
  const { data: isCollapsed, mutate: mutateSidebarCollapsed } = useSidebarCollapsed();

  const itemSelectedHandler = useCallback((selectedContents) => {

    let newValue = false;

    // already selected
    if (currentContents === selectedContents) {
      // toggle collapsed
      newValue = !isCollapsed;
    }

    mutateSidebarCollapsed(newValue, false);
    scheduleToPutUserUISettings({ isSidebarCollapsed: newValue });

  }, [currentContents, isCollapsed, mutateSidebarCollapsed]);

  return <SidebarNav onItemSelected={itemSelectedHandler} />;
};

// dummy skelton contents
const GlobalNavigationSkelton = () => {
  return (
    <div className="grw-sidebar-nav">
      <div className="grw-sidebar-nav-primary-container">
      </div>
      <div className="grw-sidebar-nav-secondary-container">
      </div>
    </div>
  );
};


const SidebarContentsWrapper = () => {
  const scrollTargetSelector = '#grw-sidebar-contents-scroll-target';

  const calcViewHeight = useCallback(() => {
    const scrollTargetElem = document.querySelector('#grw-sidebar-contents-scroll-target');
    return scrollTargetElem != null
      ? window.innerHeight - scrollTargetElem?.getBoundingClientRect().top
      : window.innerHeight;
  }, []);

  return (
    <>
      {/* <StickyStretchableScroller
        scrollTargetSelector={scrollTargetSelector}
        contentsElemSelector="#grw-sidebar-content-container"
        stickyElemSelector=".grw-sidebar"
        calcViewHeightFunc={calcViewHeight}
      /> */}

      <div id="grw-sidebar-contents-scroll-target">
        <div id="grw-sidebar-content-container">
          <SidebarContents />
        </div>
      </div>

      <DrawerToggler iconClass="icon-arrow-left" />
    </>
  );
};

// dummy skelton contents
const SidebarSkeltonContents = () => {
  return (
    <div>Skelton Contents!!!</div>
  );
};


type Props = {
}

const Sidebar: FC<Props> = (props: Props) => {
  const { data: isDrawerMode } = useDrawerMode();
  const { data: isDrawerOpened, mutate: mutateDrawerOpened } = useDrawerOpened();
  const { data: currentProductNavWidth, mutate: mutateProductNavWidth } = useCurrentProductNavWidth();
  const { data: isCollapsed, mutate: mutateSidebarCollapsed } = useSidebarCollapsed();
  const { data: isResizeDisabled, mutate: mutateSidebarResizeDisabled } = useSidebarResizeDisabled();

  /**
   * hack and override UIController.storeState
   *
   * Since UIController is an unstated container, setState() in storeState method should be awaited before writing to cache.
   */
  // hackUIController() {
  //   const { navigationUIController } = this.props;

  //   // see: @atlaskit/navigation-next/dist/esm/ui-controller/UIController.js
  //   const orgStoreState = navigationUIController.storeState;
  //   navigationUIController.storeState = async(state) => {
  //     await navigationUIController.setState(state);
  //     orgStoreState(state);
  //   };
  // }

  const toggleDrawerMode = useCallback((bool) => {
    const isStateModified = isResizeDisabled !== bool;
    if (!isStateModified) {
      return;
    }

    // Drawer <-- Dock
    if (bool) {
      // // cache state
      // this.sidebarCollapsedCached = navigationUIController.state.isCollapsed;
      // this.sidebarWidthCached = navigationUIController.state.productNavWidth;

      // // clear transition temporary
      // if (this.sidebarCollapsedCached) {
      //   this.addCssClassTemporary('grw-sidebar-supress-transitions-to-drawer');
      // }

      // disable resize
      mutateSidebarResizeDisabled(true, false);
    }
    // Drawer --> Dock
    else {
      // // clear transition temporary
      // if (this.sidebarCollapsedCached) {
      //   this.addCssClassTemporary('grw-sidebar-supress-transitions-to-dock');
      // }

      // enable resize
      mutateSidebarResizeDisabled(false, false);

      // // restore width
      // if (this.sidebarWidthCached != null) {
      //   navigationUIController.setState({ productNavWidth: this.sidebarWidthCached });
      // }
    }
  }, [isResizeDisabled, mutateSidebarResizeDisabled]);

  // addCssClassTemporary(className) {
  //   // clear
  //   this.sidebarElem.classList.add(className);

  //   // restore after 300ms
  //   setTimeout(() => {
  //     this.sidebarElem.classList.remove(className);
  //   }, 300);
  // }

  const backdropClickedHandler = useCallback(() => {
    mutateDrawerOpened(false, false);
  }, [mutateDrawerOpened]);

  const [isMounted, setMounted] = useState(false);

  useEffect(() => {
    // this.hackUIController();
    setMounted(true);
  }, []);

  useEffect(() => {
    toggleDrawerMode(isDrawerMode);
  }, [isDrawerMode, toggleDrawerMode]);

  const [isHover, setHover] = useState(false);
  const [isDragging, setDrag] = useState(false);

  const resizableContainer = useRef<HTMLDivElement>(null);
  const setContentWidth = useCallback((newWidth) => {
    if (resizableContainer.current == null) {
      return;
    }
    resizableContainer.current.style.width = `${newWidth}px`;
  }, []);

  const hoverHandler = useCallback((isHover: boolean) => {
    if (!isCollapsed || isDrawerMode) {
      return;
    }

    setHover(isHover);

    if (isHover) {
      setContentWidth(currentProductNavWidth);
    }
    if (!isHover) {
      setContentWidth(sidebarMinimizeWidth);
    }
  }, [isCollapsed, isDrawerMode, setContentWidth, currentProductNavWidth]);

  const toggleNavigationBtnClickHandler = useCallback(() => {
    const newValue = !isCollapsed;
    mutateSidebarCollapsed(newValue, false);
    scheduleToPutUserUISettings({ isSidebarCollapsed: newValue });
  }, [isCollapsed, mutateSidebarCollapsed]);

  useEffect(() => {
    if (isCollapsed) {
      setContentWidth(sidebarMinimizeWidth);
    }
    else {
      setContentWidth(currentProductNavWidth);
    }
  }, [currentProductNavWidth, isCollapsed, setContentWidth]);

  const draggableAreaMoveHandler = useCallback((event) => {
    if (isDragging) {
      event.preventDefault();
      const newWidth = event.pageX - 60;
      if (resizableContainer.current != null) {
        setContentWidth(newWidth);
        resizableContainer.current.classList.add('dragging');
      }
    }
  }, [isDragging, setContentWidth]);

  const dragableAreaMouseUpHandler = useCallback(() => {
    if (resizableContainer.current == null) {
      return;
    }

    setDrag(false);

    if (resizableContainer.current.clientWidth < sidebarMinWidth) {
      // force collapsed
      mutateSidebarCollapsed(true, false);
      mutateProductNavWidth(sidebarMinWidth, false);
      scheduleToPutUserUISettings({ isSidebarCollapsed: true, currentProductNavWidth: sidebarMinWidth });
    }
    else {
      const newWidth = resizableContainer.current.clientWidth;
      mutateProductNavWidth(newWidth, false);
      scheduleToPutUserUISettings({ currentProductNavWidth: newWidth });
    }

    resizableContainer.current.classList.remove('dragging');

    document.removeEventListener('mousemove', draggableAreaMoveHandler);
    document.removeEventListener('mouseup', dragableAreaMouseUpHandler);

  }, [draggableAreaMoveHandler, mutateProductNavWidth, mutateSidebarCollapsed]);

  const dragableAreaClickHandler = useCallback(() => {
    if (isCollapsed || isDrawerMode) {
      return;
    }
    setDrag(true);
  }, [isCollapsed, isDrawerMode]);

  useEffect(() => {
    document.addEventListener('mousemove', draggableAreaMoveHandler);
    document.addEventListener('mouseup', dragableAreaMouseUpHandler);
  }, [draggableAreaMoveHandler, dragableAreaMouseUpHandler]);

  return (
    <>
      <div className={`grw-sidebar d-print-none ${isDrawerMode ? 'grw-sidebar-drawer' : ''} ${isDrawerOpened ? 'open' : ''}`}>
        <div className="data-layout-container">
          <div className="navigation">
            <div className="grw-navigation-wrap">
              <div className="grw-global-navigation">
                { isMounted ? <GlobalNavigation></GlobalNavigation> : <GlobalNavigationSkelton></GlobalNavigationSkelton> }
              </div>
              <div
                ref={resizableContainer}
                className="grw-contextual-navigation"
                onMouseEnter={() => hoverHandler(true)}
                onMouseLeave={() => hoverHandler(false)}
                onMouseMove={draggableAreaMoveHandler}
                onMouseUp={dragableAreaMouseUpHandler}
                style={{ width: isCollapsed ? sidebarMinimizeWidth : currentProductNavWidth }}
              >
                <div className="grw-contextual-navigation-child">
                  <div role="group" className={`grw-contextual-navigation-sub ${!isHover && isCollapsed ? 'collapsed' : ''}`}>
                    { isMounted ? <SidebarContentsWrapper></SidebarContentsWrapper> : <SidebarSkeltonContents></SidebarSkeltonContents> }
                  </div>
                </div>
              </div>
            </div>
            <div className="grw-navigation-draggable">
              <div
                className={`${!isDrawerMode ? 'resizable' : ''} grw-navigation-draggable-hitarea`}
                onMouseDown={dragableAreaClickHandler}
              >
                <div className="grw-navigation-draggable-hitarea-child"></div>
              </div>
              <button
                className={`grw-navigation-resize-button ${!isDrawerMode ? 'resizable' : ''} ${isCollapsed ? 'collapse-state' : 'normal-state'} `}
                type="button"
                aria-expanded="true"
                aria-label="Toggle navigation"
                disabled={isDrawerMode}
                onClick={toggleNavigationBtnClickHandler}
              >
                <span role="presentation">
                  <i className="ml-1 fa fa-fw fa-angle-left text-white"></i>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      { isDrawerOpened && (
        <div className="grw-sidebar-backdrop modal-backdrop show" onClick={backdropClickedHandler}></div>
      ) }
    </>
  );

};

export default Sidebar;
