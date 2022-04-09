import {
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	Inject,
	Input,
	LOCALE_ID,
	OnInit,
	Output,
} from '@angular/core';
import { Constructor } from '@angular/material/core/common-behaviors/constructor';
import { Chart, LabelConverter } from '@models/chart-base';
import { WalletStatistics } from '@models/wallet-statistics';
import { ChartOptions } from 'chart.js';
import {
	MonthLabelConverter,
	StatisticsDataConverter,
	WeekDayLabelConverter,
	WeekLabelConverter,
} from './chart-data-converters';

type TPeriod = 'year' | 'month' | 'week';
type ConverterPair = Constructor<LabelConverter>;

const CHART_LABEL_CONVERTERS = new Map<TPeriod, ConverterPair>([
	['year', MonthLabelConverter],
	['month', WeekLabelConverter],
	['week', WeekDayLabelConverter],
]);

@Component({
	selector: 'grouped-transactions-chart',
	templateUrl: './grouped-transactions-chart.component.html',
	styleUrls: ['./grouped-transactions-chart.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupedTransactionsChartComponent
	extends Chart<WalletStatistics, 'bar'>
	implements OnInit
{
	constructor(@Inject(LOCALE_ID) private readonly _localeId: string) {
		super();
	}

	@Output('onPeriodClick') onPeriodClick = new EventEmitter();

	readonly chartConfig: ChartOptions<'bar'> = {
		maintainAspectRatio: false,
		responsive: true,
		datasets: {
			bar: {
				borderRadius: 3,
			},
		},
		onClick: ($event, elements, chart) => {
			const clickedElements = chart.getElementsAtEventForMode(
				$event.native,
				'index',
				{ axis: 'x' },
				false
			);
			const periodIndex = clickedElements[0]?.index;

			if (periodIndex !== null && periodIndex !== undefined) {
				const period = this.data.getPeriod(periodIndex);

				period.hasTransactions &&
					period.name !== 'day' &&
					this.onPeriodClick.emit(period);
			}
		},
	};
	private _period: TPeriod;

	ngOnInit(): void {
		this.addDataConverter(
			new StatisticsDataConverter('expenses'),
			new StatisticsDataConverter('income')
		);
	}

	@Input('period')
	set period(period: TPeriod) {
		this._period = period;
		const LabelConverter = this._retrieveLabelConverter(period);

		this.setLabelConverter(new LabelConverter(this._localeId));
	}
	get period() {
		return this._period;
	}

	private _retrieveLabelConverter(period: TPeriod) {
		if (CHART_LABEL_CONVERTERS.has(period)) {
			return CHART_LABEL_CONVERTERS.get(period);
		} else {
			throw new Error(`Unsupported period - (${period})`);
		}
	}
}
