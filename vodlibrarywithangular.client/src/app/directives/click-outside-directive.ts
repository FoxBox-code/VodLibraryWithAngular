import { Directive, Output, ElementRef, HostListener, EventEmitter } from "@angular/core";


@Directive(
  {
    selector : '[outSideClick]',
    standalone : true

  }
)

export class ClickOutSideDirective
{
    @Output() outSideClick = new EventEmitter<void>();

    constructor(private element : ElementRef)
    {

    }

    @HostListener('document:click', ['$event'])
    onDocClick(mouseEvent : MouseEvent)
    {
        const target = mouseEvent.target as Node | null;

        

        if(target && !this.element.nativeElement.contains(target))
        {
            this.outSideClick.emit();
        }
    }

}

