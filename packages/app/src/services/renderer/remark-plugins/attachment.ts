import { Schema as SanitizeOption } from 'hast-util-sanitize';
import { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

const SUPPORTED_ATTRIBUTES = ['url', 'attachmentName'];

const isAttachmentLink = (url: unknown) => {
  // https://regex101.com/r/9qZhiK/1
  return url === new RegExp(/^\/(attachment)\/([^/^\n]+)$/);
};

export const remarkPlugin: Plugin = () => {
  return (tree) => {
    // TODO: do not use any for node.children[0].value
    visit(tree, (node: any) => {
      if (node.type === 'link') {
        if (!isAttachmentLink(node.url)) {
          const data = node.data ?? (node.data = {});
          data.hName = 'attachment';
          data.hProperties = {
            url: node.url,
            attachmentName: node.children[0].value,
          };

          // omit position to fix the key regardless of its position
          // see:
          //   https://github.com/remarkjs/react-markdown/issues/703
          //   https://github.com/remarkjs/react-markdown/issues/466
          //
          //   https://github.com/remarkjs/react-markdown/blob/a80dfdee2703d84ac2120d28b0e4998a5b417c85/lib/ast-to-react.js#L201-L204
          //   https://github.com/remarkjs/react-markdown/blob/a80dfdee2703d84ac2120d28b0e4998a5b417c85/lib/ast-to-react.js#L217-L222
          delete node.position;
        }
      }
    });
  };
};

export const sanitizeOption: SanitizeOption = {
  tagNames: ['attachment'],
  attributes: {
    attachment: SUPPORTED_ATTRIBUTES,
  },
};
