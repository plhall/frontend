import {makeAutoObservable, runInAction} from 'mobx';
import mergeByProperty from './merge-by-property';
import {RootState} from './state';
import {ESemester, ICourseFromAPI, IInstructorFromAPI, IPassFailDropFromAPI, ISectionFromAPI} from './types';

const ENDPOINTS = ['/instructors', '/passfaildrop', '/sections', '/courses'];

interface ISemesterFilter {
	semester: ESemester;
	year: number;
}

export class APIState {
	instructors: IInstructorFromAPI[] = [];
	passfaildrop: IPassFailDropFromAPI = {};
	sections: ISectionFromAPI[] = [];
	courses: ICourseFromAPI[] = [];
	loading = true;
	errors: Error[] = [];
	lastUpdatedAt: Date | null = null;

	availableSemesters: ISemesterFilter[] = [];
	selectedSemester?: ISemesterFilter;

	private readonly rootState: RootState;

	constructor(rootState: RootState) {
		makeAutoObservable(this);

		this.rootState = rootState;
	}

	get instructorsById() {
		const map = new Map<IInstructorFromAPI['id'], IInstructorFromAPI>();

		for (const instructor of this.instructors) {
			map.set(instructor.id, instructor);
		}

		return map;
	}

	get courseById() {
		const map = new Map<ICourseFromAPI['id'], ICourseFromAPI>();

		for (const course of this.courses) {
			map.set(course.id, course);
		}

		return map;
	}

	get sectionById() {
		const map = new Map<ISectionFromAPI['id'], ISectionFromAPI>();

		for (const s of this.sections) {
			map.set(s.id, s);
		}

		return map;
	}

	get dataLastUpdatedAt() {
		let date = new Date(0);

		const updateMaxDate = (({updatedAt}: {updatedAt: string}) => {
			const d = new Date(updatedAt);
			if (d > date) {
				date = d;
			}
		});

		for (const i of this.instructors) {
			updateMaxDate(i);
		}

		for (const c of this.courses) {
			updateMaxDate(c);
		}

		for (const s of this.sections) {
			updateMaxDate(s);
		}

		return date;
	}

	get hasCourseData() {
		return this.courses.length > 0 && this.sections.length > 0;
	}

	async getSemesters() {
		this.loading = true;

		const result = await (await fetch(new URL('/semesters', process.env.NEXT_PUBLIC_API_ENDPOINT).toString())).json();

		runInAction(() => {
			this.loading = false;
			this.availableSemesters = result;
		});
	}

	setSelectedSemester(semester: ISemesterFilter) {
		this.selectedSemester = semester;
		this.courses = [];
		this.sections = [];
		this.lastUpdatedAt = null;
	}

	// Poll for updates
	async revalidate() {
		performance.mark('start-revalidation');

		this.loading = true;

		let successfulHits = 0;

		const startedUpdatingAt = new Date();

		const promises: Array<Promise<void>> = [];

		// Only load pass fail data once
		if (Object.keys(this.passfaildrop).length === 0) {
			promises.push((async () => {
				try {
					const url = new URL('/passfaildrop', process.env.NEXT_PUBLIC_API_ENDPOINT);

					const result = await (await fetch(url.toString())).json();

					runInAction(() => {
						this.passfaildrop = result;
					});
				} catch (error: unknown) {
					runInAction(() => {
						this.errors = [...this.errors, error as Error];
					});
				}
			})());
		}

		// Load courses, sections, instructors
		promises.push(...['courses', 'sections', 'instructors'].map(async key => {
			try {
				if (!this.selectedSemester) {
					successfulHits++;
					return;
				}

				const url = new URL(`/${key}`, process.env.NEXT_PUBLIC_API_ENDPOINT);

				if (['courses', 'sections'].includes(key)) {
					url.searchParams.append('semester', this.selectedSemester.semester);
					url.searchParams.append('year', this.selectedSemester.year.toString());
				}

				if (this.lastUpdatedAt) {
					url.searchParams.append('updatedSince', this.lastUpdatedAt.toISOString());
				}

				const result = await (await fetch(url.toString())).json();

				if (result.length > 0) {
					runInAction(() => {
						// Merge
						// Spent way too long trying to get TS to recognize this as valid...
						// YOLOing with any
						// Might be relevant: https://github.com/microsoft/TypeScript/issues/16756
						type DataKey = 'courses' | 'sections' | 'instructors';
						this[key as DataKey] = mergeByProperty<any, any>(this[key as DataKey], result, 'id');
					});
				}

				successfulHits++;
			} catch (error: unknown) {
				runInAction(() => {
					this.errors = [...this.errors, error as Error];
				});
			}
		}));

		// Wait for all calls to complete
		await Promise.all(promises);

		runInAction(() => {
			this.lastUpdatedAt = startedUpdatingAt;

			this.loading = false;

			if (successfulHits === ENDPOINTS.length) {
				this.errors = [];
			}
		});

		performance.mark('end-revalidation');
		performance.measure('Revalidated Data', 'start-revalidation', 'end-revalidation');
	}
}