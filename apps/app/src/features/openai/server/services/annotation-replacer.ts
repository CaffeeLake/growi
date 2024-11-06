import type { IPageHasId } from '@growi/core/dist/interfaces';
import type { MessageDelta } from 'openai/resources/beta/threads/messages.mjs';

import VectorStoreFileRelationModel, { type VectorStoreFileRelation } from '~/features/openai/server/models/vector-store-file-relation';

type PopulatedVectorStoreFileRelation = Omit<VectorStoreFileRelation, 'pageId'> & { pageId: IPageHasId }

export const annotationReplacer = async(delta: MessageDelta): Promise<void> => {
  const content = delta.content?.[0];

  if (content?.type === 'text' && content?.text?.annotations != null) {
    const annotations = content?.text?.annotations;
    for await (const annotation of annotations) {
      if (annotation.type === 'file_citation' && annotation.text != null) {

        const vectorStoreFileRelation = await VectorStoreFileRelationModel
          .findOne({ fileIds: { $in: [annotation.file_citation?.file_id] } })
          .populate('pageId', 'path') as PopulatedVectorStoreFileRelation;

        if (vectorStoreFileRelation != null) {
          content.text.value = content.text.value?.replace(
            annotation.text,
            ` [出典:[${vectorStoreFileRelation.pageId.path}](http://localhost:3000/${vectorStoreFileRelation.pageId._id})]`,
          );
        }
      }
    }
  }
};
