import React from 'react';

import { hasEnabledSlideTypes } from '@growi/presentation';
import type { FallbackProps } from 'react-error-boundary';
import { ErrorBoundary } from 'react-error-boundary';
import ReactMarkdown from 'react-markdown';

import type { RendererOptions } from '~/interfaces/renderer-options';
import loggerFactory from '~/utils/logger';


import 'katex/dist/katex.min.css';
import { SlideViewer } from '../ReactMarkdownComponents/SlideViewer';

const logger = loggerFactory('components:Page:RevisionRenderer');

type Props = {
  rendererOptions: RendererOptions,
  markdown: string,
  additionalClassName?: string,
}

const ErrorFallback: React.FC<FallbackProps> = React.memo(({ error, resetErrorBoundary }) => {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
      <button type="button" className="btn btn-primary" onClick={resetErrorBoundary}>Reload</button>
    </div>
  );
});
ErrorFallback.displayName = 'ErrorFallback';

const RevisionRenderer = React.memo((props: Props): JSX.Element => {

  const {
    rendererOptions, markdown, additionalClassName,
  } = props;

  const [enableSlide, marp] = hasEnabledSlideTypes(markdown);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      {
        enableSlide
          ? (
            <SlideViewer
              rendererOptions={rendererOptions}
              marp={marp}
            >
              {markdown}
            </SlideViewer>
          )
          : (
            <ReactMarkdown
              {...rendererOptions}
              className={`wiki ${additionalClassName ?? ''}`}
            >
              {markdown}
            </ReactMarkdown>
          )


      }
    </ErrorBoundary>
  );

});
RevisionRenderer.displayName = 'RevisionRenderer';

export default RevisionRenderer;
