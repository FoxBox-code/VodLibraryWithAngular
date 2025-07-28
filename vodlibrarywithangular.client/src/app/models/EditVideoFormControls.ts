import { FormControl, FormGroup } from '@angular/forms';

export interface EditVideoFormControls {
  Title: FormControl<string>;
  Description: FormControl<string>;
  CategoryId: FormControl<number>;
}
