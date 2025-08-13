import { VideoWindowMini } from "../models/videoWindowMini";

export class LinkedListNode<T>
{
  value : T;
  public next : LinkedListNode<T> | null = null;
  public previous : LinkedListNode<T> | null = null;

  constructor(value : T)
  {
    this.value = value;
  }


}


export class LinkList<T>
{
  head : LinkedListNode<T> | null = null;
  tail : LinkedListNode<T> | null = null;

  



  append(value : T)
  {
    const node = new LinkedListNode(value);
    if(this.head === null)
    {
      this.head = this.tail = node;
    }
    else
    {
      this.tail!.next = node;
      node.previous = this.tail;
      this.tail = node;
    }



  }

  fromCollection(items : T[])
  {
    items.forEach(x => this.append(x));
  }

  findNode(predicate : (value : T) => boolean) : LinkedListNode<T> | null
  {
    let current = this.head;
    while(current)
    {
      if(predicate(current.value)) return current;

      current = current.next;
    }
    return null;
  }

  toArray() : T[]
  {
    let current = this.head;
    const array : T[] = [];
    while(current)
    {
      array.push(current.value);
      current = current.next;
    }

    return array;
  }

  deleteNode(predicate : (value : T) => boolean) : LinkedListNode<T> | null
  {
    let node = this.head;
    while(node)
    {
      if(predicate(node.value))
      {
          const nodePrevious = node.previous;
          const nodeNext = node.next;

          if(nodePrevious)
            nodePrevious.next = nodeNext;

          if(nodeNext)
            nodeNext.previous = nodePrevious;

          if(node == this.head)
            this.head = nodeNext;

          if(node == this.tail)
              this.tail = node.previous;

          node.next = null;
          node.previous = null;


          return node;
      }
      node = node.next;

    }

    return null;


  }


}
