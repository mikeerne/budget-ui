import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { filter, finalize, from } from 'rxjs';
import { CategoryModalComponent } from '../../category/category-modal/category-modal.component';
import { ActionSheetService } from '../../shared/service/action-sheet.service';
import { ExpenseService } from '../expense.service';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
import { ToastService } from '../../shared/service/toast.service';
import { Expense, Category } from '../../shared/domain';
import { formatISO, parseISO } from 'date-fns';
import { CategoryService } from 'src/app/category/category.services';

@Component({
  selector: 'app-expense-modal',
  templateUrl: './expense-modal.component.html',
})
export class ExpenseModalComponent {
  readonly expenseForm: FormGroup;
  expense: Expense = {} as Expense;
  categories: Category[] = [];
  submitting = false;
  constructor(
    private readonly actionSheetService: ActionSheetService,
    private readonly expenseService: ExpenseService,
    private readonly formBuilder: FormBuilder,
    private readonly modalCtrl: ModalController,
    private readonly toastService: ToastService,
    private readonly categoryService: CategoryService,
  ) {
    this.expenseForm = this.formBuilder.group({
      id: [], // hidden
      categoryId: [], // save category id
      name: ['', [Validators.required, Validators.minLength(0), Validators.maxLength(40)]],
      amount: [Validators.min(0.01)], // save value and validate min
      date: [formatISO(new Date())], // save date and validate against ISO date format
    });
  }

  cancel(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  save(): void {
    this.submitting = true;
    this.expenseService
      .upsertExpense({
        ...this.expenseForm.value,
        date: formatISO(parseISO(this.expenseForm.value.date), { representation: 'date' }),
      })
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: () => {
          this.toastService.displaySuccessToast('Expense saved');
          this.modalCtrl.dismiss(null, 'refresh');
        },
        error: (error) => this.toastService.displayErrorToast('Could not save expense', error),
      });
  }

  delete(): void {
    from(this.actionSheetService.showDeletionConfirmation('Are you sure you want to delete this expense?'))
      .pipe(filter((action) => action === 'delete'))
      .subscribe(() => this.modalCtrl.dismiss(null, 'delete'));
  }

  async showCategoryModal(): Promise<void> {
    const categoryModal = await this.modalCtrl.create({ component: CategoryModalComponent });
    categoryModal.present();
    const { role } = await categoryModal.onWillDismiss();
    console.log('role', role);
  }
  private loadAllCategories(): void {
    this.categoryService.getAllCategories({ sort: 'name,asc' }).subscribe({
      next: (categories) => (this.categories = categories),
      error: (error) => this.toastService.displayErrorToast('Could not load categories', error),
    });
  }

  ionViewWillEnter(): void {
    this.loadAllCategories();
  }
}
