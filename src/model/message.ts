import LangMetadata from "./lang_metadata";
import LangRow from "./lang_row";

export default interface Message {
  type: string,
  metadataArray: LangMetadata[],
  rowArray: LangRow[]
};