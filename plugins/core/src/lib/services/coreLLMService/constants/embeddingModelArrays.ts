import {
  BedrockEmbeddingModels,
  CohereEmbeddingModels,
  MistralEmbeddingModels,
  VoyageEmbeddingModels,
  OpenAIEmbeddingModels,
  HuggingFaceEmbeddingModels,
  EmbeddingModels,
} from '../../coreEmbeddingService/types'

export const bedrockEmbeddingModelsArray = Object.values(BedrockEmbeddingModels)
export const cohereEmbeddingModelsArray = Object.values(CohereEmbeddingModels)
export const mistralEmbeddingModelsArray = Object.values(MistralEmbeddingModels)
export const voyageEmbeddingModelsArray = Object.values(VoyageEmbeddingModels)
export const openAIEmbeddingModelsArray = Object.values(OpenAIEmbeddingModels)
export const huggingFaceEmbeddingModelsArray = Object.values(
  HuggingFaceEmbeddingModels
)

export const allEmbeddingModels: EmbeddingModels[] = [
  ...bedrockEmbeddingModelsArray,
  ...cohereEmbeddingModelsArray,
  ...mistralEmbeddingModelsArray,
  ...voyageEmbeddingModelsArray,
  ...openAIEmbeddingModelsArray,
  ...huggingFaceEmbeddingModelsArray,
]
