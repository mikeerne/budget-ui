import { Component } from '@angular/core';
import { CategoryModalComponent } from '../category-modal/category-modal.component';
import { InfiniteScrollCustomEvent, ModalController, RefresherCustomEvent } from '@ionic/angular';
import { Category, CategoryCriteria, SortOption } from '../../shared/domain';
import { CategoryService } from 'src/app/category/category.services';
import { ToastService } from '../../shared/service/toast.service';
import { debounce, finalize, interval, Subscription } from 'rxjs';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-category-list',
  templateUrl: './category-list.component.html',
})
export class CategoryListComponent {
  categories: Category[] | null = null;
  readonly initialSort = 'name,asc';
  lastPageReached = false;
  loading = false;
  searchCriteria: CategoryCriteria = { page: 0, size: 25, sort: this.initialSort };
  readonly searchForm: FormGroup;
  readonly sortOptions: SortOption[] = [
    { label: 'Created at (newest first)', value: 'createdAt,desc' },
    { label: 'Created at (oldest first)', value: 'createdAt,asc' },
    { label: 'Name (A-Z)', value: 'name,asc' },
    { label: 'Name (Z-A)', value: 'name,desc' },
  ];
  private readonly searchFormSubscription: Subscription;

  constructor(
    private readonly modalCtrl: ModalController,
    private readonly categoryService: CategoryService,
    private readonly toastService: ToastService,
    private readonly formBuilder: FormBuilder,
  ) {
    this.searchForm = this.formBuilder.group({ name: [], sort: [this.initialSort] });
    this.searchFormSubscription = this.searchForm.valueChanges
      .pipe(debounce((value) => interval(value.name?.length ? 400 : 0)))
      .subscribe((value) => {
        this.searchCriteria = { ...this.searchCriteria, ...value, page: 0 };
        this.loadCategories();
      });
  }

  //Methode zum Laden der Kategorien hinzufügen
  private loadCategories(next: () => void = () => {}): void {
    if (!this.searchCriteria.name) delete this.searchCriteria.name;
    this.loading = true;
    this.categoryService
      .getCategories(this.searchCriteria)
      .pipe(
        finalize(() => {
          this.loading = false;
          next();
        }),
      )
      .subscribe({
        next: (categories) => {
          if (this.searchCriteria.page === 0 || !this.categories) this.categories = [];
          this.categories.push(...categories.content);
          this.lastPageReached = categories.last;
        },
        error: (error) => this.toastService.displayErrorToast('Could not load categories', error),
      });
  }

  //Methode zum initialen Laden der Kategorien hinzufügen
  ionViewDidEnter(): void {
    this.loadCategories();
  }

  //Methode zum Laden der nächsten Page hinzufügen
  loadNextCategoryPage($event: any) {
    this.searchCriteria.page++;
    this.loadCategories(() => ($event as InfiniteScrollCustomEvent).target.complete());
  }

  //Methode zum Laden der ersten Page hinzufügen Refresher Element
  reloadCategories($event?: any): void {
    this.searchCriteria.page = 0;
    this.loadCategories(() => ($event ? ($event as RefresherCustomEvent).target.complete() : {}));
  }

  // Methode Nach Schliessen des Modals die Kategorien neu laden
  async openModal(category?: Category): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: CategoryModalComponent,
      componentProps: { category: category ? { ...category } : {} },
    });
    modal.present();
    const { role } = await modal.onWillDismiss();
    if (role === 'refresh') this.reloadCategories();
  }

  //Search unsubscripe for automatic search after keyinput
  ionViewDidLeave(): void {
    this.searchFormSubscription.unsubscribe();
  }
}
