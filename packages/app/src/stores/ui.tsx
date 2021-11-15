import {
  useSWRConfig, SWRResponse, Key,
} from 'swr';
import useSWRImmutable from 'swr/immutable';

import { Breakpoint, addBreakpointListener } from '@growi/ui';

import { apiv3Get } from '~/client/util/apiv3-client';
import { SidebarContentsType } from '~/interfaces/ui';
import loggerFactory from '~/utils/logger';

import { sessionStorageMiddleware } from './middlewares/sync-to-storage';
import { useStaticSWR } from './use-static-swr';
import { IUserUISettings } from '~/interfaces/user-ui-settings';

const logger = loggerFactory('growi:stores:ui');

const isServer = typeof window === 'undefined';


/** **********************************************************
 *                          Unions
 *********************************************************** */

export const EditorMode = {
  View: 'view',
  Editor: 'editor',
  HackMD: 'hackmd',
} as const;
export type EditorMode = typeof EditorMode[keyof typeof EditorMode];


/** **********************************************************
 *                          SWR Hooks
 *                      for switching UI
 *********************************************************** */

export const useIsMobile = (): SWRResponse<boolean|null, Error> => {
  const key = isServer ? null : 'isMobile';

  let configuration;
  if (!isServer) {
    const userAgent = window.navigator.userAgent.toLowerCase();
    configuration = {
      fallbackData: /iphone|ipad|android/.test(userAgent),
    };
  }

  return useStaticSWR(key, null, configuration);
};

export const useEditorMode = (editorMode?: EditorMode): SWRResponse<EditorMode, Error> => {
  const initialData = EditorMode.View;
  return useStaticSWR('editorMode', editorMode || null, { fallbackData: initialData });
};

export const useIsDeviceSmallerThanMd = (): SWRResponse<boolean|null, Error> => {
  const key: Key = isServer ? null : 'isDeviceSmallerThanMd';

  const { cache, mutate } = useSWRConfig();

  if (!isServer) {
    const mdOrAvobeHandler = function(this: MediaQueryList): void {
      // sm -> md: matches will be true
      // md -> sm: matches will be false
      mutate(key, !this.matches);
    };
    const mql = addBreakpointListener(Breakpoint.MD, mdOrAvobeHandler);

    // initialize
    if (cache.get(key) == null) {
      document.addEventListener('DOMContentLoaded', () => {
        mutate(key, !mql.matches);
      });
    }
  }

  return useStaticSWR(key);
};

export const usePreferDrawerModeByUser = (isPrefered?: boolean): SWRResponse<boolean, Error> => {
  const key = isServer ? null : 'preferDrawerModeByUser';

  const initialData = false;
  return useStaticSWR(key, isPrefered || null, { fallbackData: initialData, use: [sessionStorageMiddleware] });
};

export const usePreferDrawerModeOnEditByUser = (isPrefered?: boolean): SWRResponse<boolean, Error> => {
  const key = isServer ? null : 'preferDrawerModeOnEditByUser';

  const initialData = true;
  return useStaticSWR(key, isPrefered || null, { fallbackData: initialData, use: [sessionStorageMiddleware] });
};

export const useDrawerMode = (): SWRResponse<boolean, Error> => {
  const key = isServer ? null : 'isDrawerMode';
  const { localStorage } = window;

  const { data: editorMode } = useEditorMode();
  const { data: preferDrawerModeByUser } = usePreferDrawerModeByUser(localStorage?.preferDrawerModeByUser === 'true');
  const { data: preferDrawerModeOnEditByUser } = usePreferDrawerModeOnEditByUser(
    localStorage.preferDrawerModeOnEditByUser == null || localStorage?.preferDrawerModeOnEditByUser === 'true',
  );
  const { data: isDeviceSmallerThanMd } = useIsDeviceSmallerThanMd();

  console.log('useDrawerMode hook called:', editorMode, preferDrawerModeByUser, preferDrawerModeOnEditByUser);

  // get preference on view or edit
  const preferDrawerMode = editorMode !== EditorMode.View ? preferDrawerModeOnEditByUser : preferDrawerModeByUser;

  const isDrawerMode = isDeviceSmallerThanMd || preferDrawerMode;

  return useStaticSWR(key, isDrawerMode || null);
};

export const useDrawerOpened = (isOpened?: boolean): SWRResponse<boolean, Error> => {
  const initialData = false;
  return useStaticSWR('isDrawerOpened', isOpened || null, { fallbackData: initialData });
};


/** **********************************************************
 *                          SWR Hooks
 *                      for switching UI
 *********************************************************** */

export const useSWRxUserUISettings = (): SWRResponse<IUserUISettings, Error> => {
  const key = isServer ? null : 'userUISettings';

  return useSWRImmutable(
    key,
    () => apiv3Get<IUserUISettings>('/user-ui-settings').then(response => response.data),
  );
};

export const useSidebarCollapsed = (): SWRResponse<boolean, Error> => {
  const { data } = useSWRxUserUISettings();
  const key = data === undefined ? null : 'isSidebarCollapsed';
  const initialData = data?.isSidebarCollapsed || false;

  return useStaticSWR(
    key,
    null,
    {
      fallbackData: initialData,
      use: [sessionStorageMiddleware],
    },
  );
};

export const useCurrentSidebarContents = (): SWRResponse<SidebarContentsType, Error> => {
  const { data } = useSWRxUserUISettings();
  const key = data === undefined ? null : 'sidebarContents';
  const initialData = data?.currentSidebarContents || SidebarContentsType.RECENT;

  return useStaticSWR(
    key,
    null,
    {
      fallbackData: initialData,
      use: [sessionStorageMiddleware],
    },
  );
};

export const useCurrentProductNavWidth = (): SWRResponse<number, Error> => {
  const { data } = useSWRxUserUISettings();
  const key = data === undefined ? null : 'productNavWidth';
  const initialData = data?.currentProductNavWidth || 320;

  return useStaticSWR(
    key,
    null,
    {
      fallbackData: initialData,
      use: [sessionStorageMiddleware],
    },
  );
};

export const useSidebarResizeDisabled = (isDisabled?: boolean): SWRResponse<boolean, Error> => {
  const initialData = false;
  return useStaticSWR('isSidebarResizeDisabled', isDisabled || null, { fallbackData: initialData });
};
