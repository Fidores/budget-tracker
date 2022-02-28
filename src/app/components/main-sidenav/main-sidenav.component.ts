import { BreakpointObserver } from '@angular/cdk/layout';
import {
	AfterViewInit,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ViewChild,
} from '@angular/core';
import { MatDrawerMode, MatSidenav } from '@angular/material/sidenav';
import { Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { Breakpoint } from 'src/app/common/breakpoints';
import { MainSidenavService } from 'src/app/services/main-sidenav/main-sidenav.service';

@Component({
	selector: 'main-sidenav',
	templateUrl: './main-sidenav.component.html',
	styleUrls: ['./main-sidenav.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainSidenavComponent implements AfterViewInit {
	constructor(
		private readonly _breakpointObserver: BreakpointObserver,
		private readonly _mainSidenav: MainSidenavService,
		private readonly _changeDetector: ChangeDetectorRef
	) {}

	@ViewChild(MatSidenav) sidenav: MatSidenav;

	private readonly _correspondingMode: Map<Breakpoint, MatDrawerMode> = new Map(
		[
			[Breakpoint.XSmall, 'over'],
			[Breakpoint.Small, 'over'],
			[Breakpoint.Medium, 'side'],
			[Breakpoint.Large, 'side'],
			[Breakpoint.XLarge, 'side'],
			[Breakpoint.XXLarge, 'side'],
		]
	);

	sidenavMode$: Observable<MatDrawerMode> = this._breakpointObserver
		.observe([
			Breakpoint.XSmall,
			Breakpoint.Small,
			Breakpoint.Medium,
			Breakpoint.Large,
			Breakpoint.XLarge,
			Breakpoint.XXLarge,
		])
		.pipe(
			map(
				result =>
					Object.entries(result.breakpoints).find(([, value]) => value)[0]
			),
			map(breakpoint => this._correspondingMode.get(breakpoint as any) ?? null),
			distinctUntilChanged()
		);

	ngAfterViewInit(): void {
		this._mainSidenav.matSidenav = this.sidenav;
		this._mainSidenav.stateChange.subscribe(() =>
			this._changeDetector.detectChanges()
		);
	}
}
