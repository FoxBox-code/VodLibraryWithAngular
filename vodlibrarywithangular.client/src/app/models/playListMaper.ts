import { LinkedListNode, LinkList } from "../utility/linkedListImplementation";
import { VideoWindowMini } from "./videoWindowMini";

export interface PlayListMapper
{
  selectedVideoId : number,
  playList : LinkList<VideoWindowMini>,
  currentNode : LinkedListNode<VideoWindowMini> | null

}
