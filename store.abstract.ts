/**
 * Типы Subject`ов для определенной логики манипуляций с данными
 */
type CreateItemBehaviourSubjects<T> = [BehaviorSubject<T | null>, BehaviorSubject<T[]>, BehaviorSubject<boolean>];
type UpdateItemBehaviourSubjects<T> = CreateItemBehaviourSubjects<T>;
type UpdateMultipleItemBehaviourSubjects<T> = [BehaviorSubject<T[]>, BehaviorSubject<boolean>];
type DeleteItemBehaviourSubjects<T> = UpdateMultipleItemBehaviourSubjects<T>;

/**
 * AbstractStore, предоставляет удобную работу с хранением, получением и с манипуляцией данными определенной сущности и ее производных.
 * AbstractStore построена на основе использования Subject {@link https://www.learnrxjs.io/learn-rxjs/subjects}
 * При использовании AbstractStore, необходимо передать ему входным парметром класс модели сущности.
 */
@Directive()
export abstract class AbstractStore<T> {
  /**
   * Базовый набор сторов для хранения данных определенной сущности и ее производных
   */
  protected _itemStore = this.createItemStore<T>();
  protected _itemsStore = this.createItemsStore<T>();
  protected _isFetchingStore = this.createFetchingStore();
  protected _isFetchingAfterManipulateStore = this.createFetchingStore();
  private _responseStore = this.createItemStore<any>();
  private _errorStore = this.createItemStore<any>();

  /**
   * Базовый набор Observables для получения данных определенной сущности и ее производных
   */
  protected _itemObservable = this._itemStore.asObservable();
  protected _itemsObservable = this._itemsStore.asObservable();
  protected _isFetchingObservable = this._isFetchingStore.asObservable();
  protected _isFetchingAfterManipulateObservable = this._isFetchingAfterManipulateStore.asObservable();
  protected _responseObservable = this._responseStore.asObservable();
  protected _errorObservable = this._errorStore.asObservable();

  /**
   * Базовый набор геттеров определенной сущности и ее производных
   */
  protected _getItemValue = this._itemStore.getValue();
  protected _getItemsValue = this._itemsStore.getValue();
  protected _isFetchingValue = this._isFetchingStore.getValue();
  protected _isFetchingAfterManipulateValue = this._isFetchingAfterManipulateStore.getValue();
  protected _responseValue = this._responseStore.getValue();
  protected _getErrorValue = this._errorStore.getValue();


  /**
   * Базовый набор сеттеров определенной сущности и ее производных
   */
  protected _setItemValue = this.setValueCreator<T | null>(this._itemStore);
  protected _setItemsValue = this.setValueCreator<T[]>(this._itemsStore);
  protected _setErrorValue = this.setValueCreator(this._errorStore);

  /**
   * Приватный геттер для внутренней работы AbstractStore
   */
  private get _items(): T[] | [] {
    return this._itemsStore.getValue();
  }

  public get isLoaded(): boolean {
    return this._isFetchingValue === false;
  }

  public get isLoadedAfterManipulate(): boolean {
    return this._isFetchingAfterManipulateValue === false;
  }

  protected constructor(private readonly model: Type<T>) {
  }

  /**
   * Возвращает BehaviorSubject для одного элемента
   * @param initialValue инициализационное значение, по умолчанию null
   */
  protected createItemStore<T>(initialValue: T | null = null): BehaviorSubject<T | null> {
    return new BehaviorSubject<T | null>(initialValue);
  }

  /**
   * Возвращает BehaviorSubject для массива элементов
   * @param initialValue инициализационное значение, по умолчанию []
   */
  protected createItemsStore<T>(initialValue: T[] = []): BehaviorSubject<T[] | []> {
    return new BehaviorSubject<T[] | []>(initialValue);
  }

  /**
   * Возвращает BehaviorSubject для флага isFetching, который используется для определения загружаются ли данные
   * @param initialValue инициализационное значение, по умолчанию false
   */
  protected createFetchingStore(initialValue: boolean = false): BehaviorSubject<boolean> {
    return new BehaviorSubject<boolean>(initialValue);
  }

  /**
   * Возвращает функцию, которая записывает новое значение в Subject
   * @param store один из видов Subject, в который будет записываться значение
   */
  protected setValueCreator<T>(store: SubjectLike<T>): (value: T) => void {
    return (value: T) => store.next(value);
  }

  /**
   * Преобразует сущность в модель и возвращает ее
   * @param model модель в которую необходимо преобразовать сущность
   * @param item сущность, которую необходимо преобразовать
   */
  protected getModel<T, K>(model: Type<T>, item: K): T {
    return new model(item);
  }

  /**
   * Преобразует массив элементов сущности в массив моделей этой сущности и возвращает его
   * @param model модель в которую необходимо преобразовать массив сущностей
   * @param items массив сущности, которую необходимо преобразовать
   */
  protected getModels<T, K>(model: Type<T>, items: Array<K>): T[] | [] {
    return getClassInstances(model, items);
  }

  /**
   * RxJs pipe преобразующий предыдущее значение стрима в указанную модель, далее записывающий эту модель в store элемента
   * и выставляющий положение флага isFetching в false
   * @param model модель в которую необходимо преобразовать сущность (по умолчаю модель переданная в конструктор AbstractStore)
   * @param store BehaviorSubject, в который будет записана полученная из сущности модель (по умолчанию itemStore)
   */
  protected getModelAndSetValue(
    model: Type<T> = this.model,
    store: BehaviorSubject<T | null> = this._itemStore,
  ): OperatorFunction<unknown, T> {
    return pipe(
      map((value: unknown) => this.getModel(model, value)),
      tap(model => store.next(model)),
      tap(() => this._isFetchingStore.next(false)),
      catchError(() => {
        this._isFetchingStore.next(false);
        return EMPTY;
      }),
    );
  }

  /**
   * RxJs pipe преобразующий предыдущее значение стрима в массив моделей, далее записывающий этот массив в store элементов
   * и выставляющий положение флага isFetching в false
   * @param model модель в которую необходимо преобразовать массив сущностей ( по умолчаю модель переданная в конструктор AbstractStore)
   * @param store BehaviorSubject, в который будет записан массив полученных из сущности моделей (по умолчанию itemsStore)
   */
  protected getModelsAndSetValue(
    model: Type<T> = this.model,
    store: BehaviorSubject<T[]> = this._itemsStore,
  ): OperatorFunction<unknown[], T[]> {
    return pipe(
      map((value: unknown[]) => this.getModels(model, value)),
      tap(models => store.next(models)),
      tap(() => this._isFetchingStore.next(false)),
      catchError(() => {
        this._isFetchingStore.next(false);
        return EMPTY;
      }),
    );
  }

  /**
   * RxJs pipe записывающий response в BehaviorSubject, далее получающий массив элементов по ключу респонса,
   * и выполняющий логику метода getModelsAndSetValue для этих элементов
   * @param key имя ключа по которому необходимо получить массив элементов из респонса ( по умолчаю "results")
   */
  protected takeItemsGetModelsAndSetValue(key: string = 'results'): OperatorFunction<any, T[]> {
    return pipe(
      tap(response => this._responseStore.next(response)),
      map((value: { [key: string]: unknown[] }) => value[key]),
      this.getModelsAndSetValue(),
      tap(() => this._isFetchingStore.next(false)),
      catchError(() => {
        this._isFetchingStore.next(false);
        return EMPTY;
      }),
    );
  }

  /**
   * RxJs pipe логика, необходимая после создания элемента на сервере(
   * 1. Записывает response в BehaviorSubject респонса
   * 2. Получает модель из предыдущего значения стрима
   * 3. Записывает эту модель в BehaviorSubject элемента
   * 4. В зависимости от параметра "position", добавляет новую модель в начало или в конец массива элементов BehaviorSubject`а
   * 5. Устанавливает положение флага isFetchingAfterManipulateStore в false
   * )
   * @param position позиция, указывающая куда необходимо вставить новый элемент (по умолчанию "last", в конец)
   * @param model модель в которую необходимо преобразовать сущность (по умолчаю модель переданная в конструктор AbstractStore)
   * @param stores массив BehaviorSubject`ов, в которые будут записаны необходимые значения
   * (по умолчанию, [itemStore, itemsStore, isFetchingAfterManipulateStore])
   */
  protected createItemBehavior(
    position: 'head' | 'last' = 'last',
    model: Type<T> = this.model,
    stores: CreateItemBehaviourSubjects<T> = [this._itemStore, this._itemsStore, this._isFetchingAfterManipulateStore],
  ): OperatorFunction<unknown, T> {
    return this.preventBehaviourIfError(
      pipe(
        tap(response => this._responseStore.next(response)),
        map(value => this.getModel(model, value)),
        tap(model => {
          stores[0]?.next(model);
          stores[1]?.next(position === 'head' ? [model, ...stores[1]?.value] : [...stores[1]?.value, model]);
          stores[2]?.next(false);
        }),
        catchError(() => {
          stores[2]?.next(false);
          return EMPTY;
        }),
      ),
    );
  }

  /**
   * RxJs pipe логика, необходимая после обновления элемента на сервере(
   * 1. Записывает response в BehaviorSubject респонса
   * 2. Получает модель из предыдущего значения стрима
   * 3. Записывает эту модель в BehaviorSubject элемента
   * 4. Обновляет элемент в массиве элементов BehaviorSubject`а новым элементов
   * 5. Устанавливает положение флага isFetchingAfterManipulateStore в false
   * )
   * @param model модель в которую необходимо преобразовать сущность (по умолчаю модель переданная в конструктор AbstractStore)
   * @param stores массив BehaviorSubject`ов, в которые будут записаны необходимые значения
   * (по умолчанию, [itemStore, itemsStore, isFetchingAfterManipulateStore])
   */
  protected updateItemBehavior(
    model: Type<T> = this.model,
    stores: UpdateItemBehaviourSubjects<T> = [this._itemStore, this._itemsStore, this._isFetchingAfterManipulateStore],
  ): OperatorFunction<unknown, T> {
    return this.preventBehaviourIfError(
      pipe(
        tap(response => this._responseStore.next(response)),
        map(value => this.getModel(model, value)),
        tap(model => {
          stores[0]?.next(model);
          stores[1]?.next([...updateItemsArrayById(stores[1]?.value, model)]);
          stores[2]?.next(false);
        }),
        catchError(() => {
          stores[2]?.next(false);
          return EMPTY;
        }),
      ),
    );
  }

  /**
   * RxJs pipe логика, необходимая после множественного обновления элементов на сервере(
   * 1. Записывает response в BehaviorSubject респонса
   * 2. Получает массив моделей из предыдущего значения стрима
   * 3. Обновляет элементы в массиве элементов BehaviorSubject`а новыми элементами
   * 4. Устанавливает положение флага isFetchingAfterManipulateStore в false
   * )
   * @param model модель в которую необходимо преобразовать сущность (по умолчаю модель переданная в конструктор AbstractStore)
   * @param stores массив BehaviorSubject`ов, в которые будут записаны необходимые значения
   * (по умолчанию, [itemsStore, isFetchingAfterManipulateStore])
   */
  protected updateMultipleItemsBehavior(
    model: Type<T> = this.model,
    stores: UpdateMultipleItemBehaviourSubjects<T> = [this._itemsStore, this._isFetchingAfterManipulateStore],
  ): OperatorFunction<unknown, T[]> {
    return this.preventBehaviourIfError(
      pipe(
        tap(response => this._responseStore.next(response)),
        map(value => this.getModels(model, value)),
        tap(models => {
          stores[0]?.next([...updateMultipleItemsArrayById(stores[0]?.value, models)]);
          stores[1]?.next(false);
        }),
        catchError(() => {
          stores[1]?.next(false);
          return EMPTY;
        }),
      ),
    );
  }

  /**
   * RxJs pipe логика, необходимая после удаления элемента на сервере(
   * 1. Записывает response в BehaviorSubject респонса
   * 2. Удаляет элемент из массива элементов BehaviorSubject`а, находя его по переданному id
   * 3. Устанавливает положение флага isFetchingAfterManipulateStore в false
   * )
   * @param itemId id элемента, который необходимо удалить
   * @param stores массив BehaviorSubject`ов, в которые будут записаны необходимые значения
   * (по умолчанию, [itemsStore, isFetchingAfterManipulateStore])
   */
  protected deleteItemBehavior(
    itemId: number,
    stores: DeleteItemBehaviourSubjects<T> = [this._itemsStore, this._isFetchingAfterManipulateStore],
  ): MonoTypeOperatorFunction<unknown> {
    return this.preventBehaviourIfError(
      pipe(
        tap(response => this._responseStore.next(response)),
        tap(() => {
          stores[0]?.next([...stores[0]?.value?.filter((item: ItemWithId<T>) => item?.id !== itemId)]);
          stores[1]?.next(false);
        }),
        catchError(() => {
          stores[1]?.next(false);
          return EMPTY;
        }),
      ),
    );
  }

  /**
   * RxJs pipe логика-обертка, необходимая для предотвращения выполнения логики манипуляций с данными, если в стриме упала ошибка.
   * Если упала ошибка, то ошибку записывает в BehaviorSubject ошибки, устанавливает положение флага isFetchingAfterManipulateStore в false
   * и прекращает радоту стрима, в противном случае продолжает работу, передав значение стрима в логику манипуляций с данными.
   * @param behavior RxJs pipe логика, которую необходимо обернуть
   */
  protected preventBehaviourIfError(
    behavior: OperatorFunction<any, any> | MonoTypeOperatorFunction<any>,
  ): UnaryFunction<Observable<unknown>, Observable<any>> {
    return pipe(
      catchError(err => {
        this._errorStore.next(err);
        this._isFetchingAfterManipulateStore.next(false);
        return throwError(err);
      }),
      switchMap(value => of(value).pipe(behavior)),
    );
  }

  /**
   * Функция-обертка, которая перед тем как начать выполнения логики переданной функции, устанавливает флаг isFetching в true
   * @param func функция, которую неоходимо обернуть
   */
  protected startFetchingWrapper<T>(func: T): T {
    this._isFetchingStore.next(true);
    return func;
  }

  /**
   * Функция-обертка, которая перед тем как начать выполнения логики переданной функции,
   * устанавливает флаг isFetchingAfterManipulateStore в true
   * @param func функция, которую неоходимо обернуть
   */
  protected startFetchingAfterManipulateWrapper<T>(func: T): T {
    this._isFetchingAfterManipulateStore.next(true);
    return func;
  }

  /**
   * Если находит элемент в массиве элементов BehaviorSubject`а по id, то возвращает его, в противном случае возвращает null
   * @param id элемента, который необходимо найти и вернуть
   */
  public getItemByIdFromStore(id: number): T | null {
    if (this._items) {
      return findAndGetItemById(this._items, id);
    }
    return null;
  }

  /**
   * Очищает BehaviorSubject элемента
   */
  public clearItemStore(): void {
    this._itemStore.next(null);
  }

  /**
   * Очищает BehaviorSubject массива элементов
   */
  public clearItemsStore(): void {
    this._itemsStore.next([]);
  }
}
