import { ChangeDetectionStrategy, Component } from '@angular/core';
import { getDownloadURL } from '@angular/fire/storage';
import { MatDialog } from '@angular/material/dialog';
import {
	INewCategoryDialogResult,
	NewCategoryDialogComponent,
} from '@components/new-category-dialog/new-category-dialog.component';
import { DEFAULT_CLUE_NAME } from '@directives/clue-if/clue-if.directive';
import { generateUniqueString } from '@helpers/generateUniqueString';
import { ICategory, ICategoryBase } from '@interfaces/category';
import { AlertService } from '@services/alert/alert.service';
import { CategoriesService } from '@services/categories/categories.service';
import { LoadingService } from '@services/loading/loading.service';
import { StorageService } from '@services/storage/storage.service';
import { from, Observable } from 'rxjs';
import { filter, first, map, switchMap } from 'rxjs/operators';

@Component({
	templateUrl: './categories.component.html',
	styleUrls: ['./categories.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [
		{
			provide: DEFAULT_CLUE_NAME,
			useValue: 'noCategories',
		},
	],
})
export class CategoriesComponent {
	constructor(
		private readonly _categories: CategoriesService,
		private readonly _loading: LoadingService,
		private readonly _dialog: MatDialog,
		private readonly _storage: StorageService,
		private readonly _alert: AlertService
	) {}

	categories$: Observable<ICategory[]> = this._categories.list();

	/**
	 * Opens the dialog to gather required information and after closing, it adds a category with returned data.
	 */
	addCategory() {
		this._openDialog().subscribe(async result => {
			const id = generateUniqueString();

			this._loading.add(
				this._categories
					.create(await this._buildCategory(result, id), id)
					.pipe(first())
					.toPromise()
			);
		});
	}

	/**
	 * Opens the dialog to gather required information and after closing, it updates the category with returned data.
	 * @param category Category that will be updated.
	 */
	editCategory(category: ICategory) {
		this._openDialog(category).subscribe(async result => {
			const newCategory = await this._buildCategory(result, category.id);

			this._loading.add(
				this._categories
					.update(category.id, newCategory)
					.pipe(first())
					.toPromise()
			);
		});
	}

	/** Deletes a category. */
	async deleteCategory(category: ICategory) {
		try {
			await this._loading.add(
				this._categories.delete(category.id).pipe(first()).toPromise()
			);
		} catch (error) {
			this._handleError(error);
		}
	}

	/**
	 * Builds a category object with data returned from the dialog. If icon is available it is uploaded to the storage.
	 */
	private async _buildCategory(
		category: INewCategoryDialogResult,
		id: string
	): Promise<ICategoryBase> {
		const iconChanged = category.icon instanceof File;
		let iconUrl: string;
		let iconPath: string;

		if (iconChanged) {
			const { url, path } = await this._loading.add(
				this._uploadIcon(category.icon, id)
			);

			iconUrl = url;
			iconPath = path;
		}

		const payload: ICategoryBase = {
			name: category.name,
			icon: iconUrl,
			iconPath,
			defaultTransactionsType: category.defaultTransactionsType,
		};

		if (!iconChanged) {
			delete payload.icon;
			delete payload.iconPath;
		}

		return payload;
	}

	/**
	 * Opens a dialog.
	 *
	 * @param category Category object that will be available in the injector.
	 * @returns An observable that emits only once and only if dialog returns any data.
	 */
	private _openDialog(category?: ICategory) {
		return this._dialog
			.open<
				NewCategoryDialogComponent,
				ICategory | null,
				INewCategoryDialogResult
			>(NewCategoryDialogComponent, {
				width: '300px',
				data: category,
			})
			.afterClosed()
			.pipe(
				first(),
				filter(data => !!data)
			);
	}

	/**
	 * Uploads an icon.
	 *
	 * @param icon Icon that will be uploaded to the storage.
	 * @returns Url to the file.
	 */
	private _uploadIcon(
		icon: File,
		id: string
	): Promise<{ url: string; path: string }> {
		const upload = this._storage.upload('categories-icons', icon, id);

		return upload.snapshot$
			.pipe(
				filter(snap => snap.bytesTransferred === snap.totalBytes),
				switchMap(snap =>
					from(getDownloadURL(snap.ref)).pipe(
						map(url => ({ path: snap.ref.fullPath, url }))
					)
				),
				first()
			)
			.toPromise();
	}

	private _handleError(error: any) {
		if (error.code === 'is-referenced') {
			this._alert.open(
				'Przynajmniej jedna transakcja znajduję się w tej kategorii.',
				'Błąd podczas usuwania kategorii.'
			);
		}
	}
}
