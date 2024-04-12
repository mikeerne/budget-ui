import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { filter, finalize, from, mergeMap, tap } from 'rxjs';
import { CategoryModalComponent } from '../../category/category-modal/category-modal.component';
import { ActionSheetService } from '../../shared/service/action-sheet.service';
import { Category, Expense } from '../../shared/domain';
import { ExpenseService } from '../expense.service';
import { CategoryService } from 'src/app/category/category.services';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastService } from '../../shared/service/toast.service';
import { format, formatISO, parseISO } from 'date-fns';

@Component({
  selector: 'app-expense-modal',
  templateUrl: './expense-modal.component.html',
})
export class ExpenseModalComponent implements OnInit {
  ngOnInit(): void {
    const { id, amount, category, date, name } = this.expense;
    if (category) this.categories.push(category);
    if (id) this.expenseForm.patchValue({ id, amount, categoryId: category?.id, date, name });
    this.loadAllCategories();
  }

  categories: Category[] = [];
  expense: Expense = {} as Expense;

  constructor(
    private readonly actionSheetService: ActionSheetService,
    private readonly modalCtrl: ModalController,
    private readonly categoryService: CategoryService,
    private readonly formBuilder: FormBuilder,
    private readonly toastService: ToastService,
    private readonly expenseService: ExpenseService,
  ) {
    this.expenseForm = this.formBuilder.group({
      id: [], //hidden
      categoryId: [],
      name: ['', [Validators.required, Validators.maxLength(40)]],
      amount: ['', [Validators.required, Validators.pattern(/^\d+$/)]], // Prüfung, damit nur Zahlen zugelassen sind
      date: [formatISO(new Date())],
    });
  }

  readonly expenseForm: FormGroup;
  submitting = false;

  // Load all categories
  private loadAllCategories(): void {
    this.categoryService.getAllCategories({ sort: 'name,asc' }).subscribe({
      next: (categories) => {
        this.categories = [{ id: '', name: '' }, ...categories];
      },
      error: (error) => this.toastService.displayErrorToast('Could not load categories', error),
    });
  }

  // Cancel
  cancel(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  // Save
  save(): void {
    this.submitting = true;
    const categoryId = this.expenseForm.value.categoryId === '' ? null : this.expenseForm.value.categoryId; //set categoryId to null if empty string
    this.expenseService
      .upsertExpense({
        ...this.expenseForm.value,
        categoryId: categoryId, //Ensure categoryId is null if empty string
        date: formatISO(parseISO(this.expenseForm.value.date), { representation: 'date' }),
      })
      .subscribe({
        next: () => {
          this.toastService.displaySuccessToast('Expense saved');
          this.modalCtrl.dismiss(null, 'refresh');
        },
        error: (error) => this.toastService.displayErrorToast('Could not save Expense', error),
      });
  }

  //Delete
  delete(): void {
    from(this.actionSheetService.showDeletionConfirmation('Are you sure you want to delete this expense?'))
      .pipe(
        filter((action) => action === 'delete'),
        tap(() => (this.submitting = true)),
        mergeMap(() => this.expenseService.deleteExpense(this.expense.id!)),
        finalize(() => (this.submitting = false)),
      )
      .subscribe({
        next: () => {
          this.toastService.displaySuccessToast('Category deleted');
          this.modalCtrl.dismiss(null, 'refresh');
        },
        error: (error) => this.toastService.displayErrorToast('Could not delete category', error),
      });
  }

  async showCategoryModal(): Promise<void> {
    const categoryModal = await this.modalCtrl.create({ component: CategoryModalComponent });
    categoryModal.present();
    const { role } = await categoryModal.onWillDismiss();
    if (role === 'refresh') this.loadAllCategories();
  }
}
