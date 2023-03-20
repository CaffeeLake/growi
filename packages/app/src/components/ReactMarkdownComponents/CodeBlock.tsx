import { useMemo } from 'react';

import type { CodeComponent } from 'react-markdown/lib/ast-to-react';
import { PrismAsyncLight } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

import styles from './CodeBlock.module.scss';

export const CodeBlock: CodeComponent = ({ inline, className, children }) => {

  const isHighlightedByElasticsearch = useMemo((): boolean => {
    const hasOnlyOneStringChild = children.length === 1 && typeof children[0] === 'string';
    return !hasOnlyOneStringChild;
  }, [children]);

  if (inline) {
    return <code className={`code-inline ${className ?? ''}`}>{children}</code>;
  }

  // TODO: set border according to the value of 'customize:highlightJsStyleBorder'

  const match = /language-(\w+)(:?.+)?/.exec(className || '');
  const lang = match && match[1] ? match[1] : '';
  const name = match && match[2] ? match[2].slice(1) : null;

  return (
    <>
      {name != null && (
        <cite className={`code-highlighted-title ${styles['code-highlighted-title']}`}>{name}</cite>
      )}
      {isHighlightedByElasticsearch ? (
        <div className="code-highlighted" style={oneDark['pre[class*="language-"]']}>
          <code className={`language-${lang}`} style={oneDark['code[class*="language-"]']}>
            {children}
          </code>
        </div>
      ) : (
        <PrismAsyncLight
          className="code-highlighted"
          PreTag="div"
          style={oneDark}
          language={lang}
        >
          {String(children).replace(/\n$/, '')}
        </PrismAsyncLight>
      )}
    </>
  );
};
