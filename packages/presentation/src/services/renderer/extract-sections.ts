import type { Schema as SanitizeOption } from 'hast-util-sanitize';
import type { Plugin } from 'unified';
import type { Parent, Node } from 'unist';
import { findAfter } from 'unist-util-find-after';
import { visit } from 'unist-util-visit';


function wrapWithSection(parentNode: Parent, startElem: Node, endElem: Node | null, isDarkMode?: boolean): void {
  const siblings = parentNode.children;

  const startIndex = siblings.indexOf(startElem);
  const endIndex = endElem != null ? siblings.indexOf(endElem) : undefined;

  const between = siblings.slice(
    startIndex,
    endIndex,
  );

  const section = {
    type: 'section',
    children: between,
    data: {
      hName: 'section',
      hProperties: {
        className: isDarkMode ? 'invert' : '',
      },
    },
  };

  siblings.splice(startIndex, between.length, section);
}

function removeElement(parentNode: Parent, elem: Node): void {
  const siblings = parentNode.children;
  siblings.splice(siblings.indexOf(elem), 1);
}

export type ExtractSectionsPluginParams = {
  isDarkMode?: boolean,
}

export const remarkPlugin: Plugin<[ExtractSectionsPluginParams]> = (options) => {
  const { isDarkMode } = options;

  return (tree) => {
    // wrap with <section>
    visit(
      tree,
      node => node.type !== 'thematicBreak',
      (node, index, parent: Parent) => {
        if (parent == null || parent.type !== 'root') {
          return;
        }

        const startElem = node;
        const endElem = findAfter(parent, startElem, node => node.type === 'thematicBreak');

        wrapWithSection(parent, startElem, endElem, isDarkMode);

        // remove <hr>
        if (endElem != null) {
          removeElement(parent, endElem);
        }
      },
    );
  };
};


export const sanitizeOption: SanitizeOption = {
  // tagNames: ['slides', 'slide'],
};