import React, { useCallback } from 'react';

import type { PresentationProps } from '@growi/presentation/dist/client';
import { LoadingSpinner } from '@growi/ui/dist/components';
import { useFullScreen } from '@growi/ui/dist/utils';
import dynamic from 'next/dynamic';
import type { ReactMarkdownOptions } from 'react-markdown/lib/react-markdown';
import {
  Modal, ModalBody,
} from 'reactstrap';

import { useIsEnabledMarp } from '~/stores/context';
import { usePagePresentationModal } from '~/stores/modal';
import { useSWRxCurrentPage } from '~/stores/page';
import { usePresentationViewOptions } from '~/stores/renderer';
import { useNextThemes } from '~/stores/use-next-themes';


import styles from './PagePresentationModal.module.scss';


const Presentation = dynamic<PresentationProps>(() => import('./Presentation/Presentation').then(mod => mod.Presentation), {
  ssr: false,
  loading: () => (
    <LoadingSpinner className="text-muted fs-1" />
  ),
});


const PagePresentationModal = (): JSX.Element => {

  const { data: presentationModalData, close: closePresentationModal } = usePagePresentationModal();

  const { isDarkMode } = useNextThemes();
  const fullscreen = useFullScreen();

  const { data: currentPage } = useSWRxCurrentPage();
  const { data: rendererOptions } = usePresentationViewOptions();

  const { data: isEnabledMarp } = useIsEnabledMarp();

  const toggleFullscreenHandler = useCallback(() => {
    if (fullscreen.active) {
      fullscreen.exit();
    }
    else {
      fullscreen.enter();
    }
  }, [fullscreen]);

  const closeHandler = useCallback(() => {
    if (fullscreen.active) {
      fullscreen.exit();
    }
    closePresentationModal();
  }, [fullscreen, closePresentationModal]);

  const isOpen = presentationModalData?.isOpened ?? false;

  if (!isOpen) {
    return <></>;
  }

  const markdown = currentPage?.revision?.body;

  return (
    <Modal
      isOpen={isOpen}
      toggle={closeHandler}
      data-testid="page-presentation-modal"
      className={`grw-presentation-modal ${styles['grw-presentation-modal']}`}
    >
      <div className="grw-presentation-controls d-flex">
        <button
          className="btn material-symbols-outlined"
          type="button"
          aria-label="fullscreen"
          onClick={toggleFullscreenHandler}
        >
          {fullscreen.active ? 'close_fullscreen' : 'open_in_full'}
        </button>
        <button className="btn-close" type="button" aria-label="Close" onClick={closeHandler}></button>
      </div>
      <ModalBody className="modal-body d-flex justify-content-center align-items-center">
        { rendererOptions != null && isEnabledMarp != null && (
          <Presentation
            options={{
              rendererOptions: rendererOptions as ReactMarkdownOptions,
              revealOptions: {
                embedded: true,
                hash: true,
              },
              isDarkMode,
            }}
            isEnabledMarp={isEnabledMarp}
          >
            {markdown}
          </Presentation>
        ) }
      </ModalBody>
    </Modal>
  );
};

export default PagePresentationModal;
