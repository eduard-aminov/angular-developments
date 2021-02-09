@Directive()
export abstract class AbstractApi<T> {
  protected constructor(protected readonly http: HttpClient) {
  }

  /**
   * Возвращает функцию-запрос на получение элементов с пагинацией с сервера
   * @param url эндпоинт на получение данных
   * @param allowedParams массив с разрешенными свойствами, например ['category', 'page', 'status']
   * @param withPreparation флаг для очистки объекта filters от свойств со значениями undefined, null и 0, по умолчанию true
   */
  protected getPaginatedItemsRequestCreator(
    url: string,
    allowedParams: string[] = [],
    withPreparation = true,
  ): <T>(filters?: T) => Observable<PaginatedResponse<T[]>> {
    return <T>(filters?: T) => {
      const params = prepareHttpParams(filters, withPreparation, allowedParams);
      return this.http.get<PaginatedResponse<T[]>>(url, { params });
    };
  }

  /**
   * Возвращает функцию-запрос на получение элементов с сервера
   * @param url эндпоинт на получение данных
   * @param allowedParams массив с разрешенными свойствами, например ['category', 'page', 'status']
   * @param withPreparation флаг для очистки объекта filters от свойств со значениями undefined, null и 0, по умолчанию true
   */
  protected getItemsRequestCreator(
    url: string,
    allowedParams: string[] = [],
    withPreparation = true,
  ): <T>(filters?: T) => Observable<T[]> {
    return <T>(filters?: T) => {
      const params = prepareHttpParams(filters, withPreparation, allowedParams);
      return this.http.get<T[]>(url, { params });
    };
  }

  /**
   * Возвращает функцию-запрос на получение элемента по id с сервера
   * @param url эндпоинт на получение данных
   */
  protected getItemByIdRequestCreator(url: string): (id: number | string) => Observable<T> {
    return (id: number | string) => {
      return this.http.get<T>(`${url}${id}/`);
    };
  }

  /**
   * Возвращает функцию-запрос на создание элемента
   * @param url эндпоинт для создания элемента
   */
  protected createItemRequestCreator(url: string): (item: T, params?: object) => Observable<T> {
    return (item: T, params?: HttpParams) => {
      return this.http.post<T>(url, item, { params });
    };
  }

  /**
   * Возвращает функцию-запрос на обновление элемента
   * @param url эндпоинт для обновления элемента
   * @param method метод запроса
   */
  protected updateItemRequestCreator(
    url: string,
    method: 'put' | 'patch' = 'put'
  ): (item: T, id: number | string, params?: object) => Observable<T> {
    return (item: T, id: number | string, params?: HttpParams) => {
      return method === 'put'
        ? this.http.put<T>(`${url}${id}/`, item, { params })
        : this.http.patch<T>(`${url}${id}/`, item, { params });
    };
  }

  /**
   * Возвращает функцию-запрос на удаление элемента
   * @param url эндпоинт для удаления элемента
   */
  protected deleteItemRequestCreator(url: string): (id: number) => Observable<unknown> {
    return (id: number) => {
      return this.http.delete<unknown>(`${url}${id}/`);
    };
  }

  /**
   * Возвращает функцию-запрос на множественное обновление выбранных элементов
   * @param url эндпоинт для обновления элементов
   * @param withPreparation флаг для очистки объекта filters от свойств со значениями undefined, null и 0, по умолчанию true
   */
  protected updateMultipleItemsRequestCreator(
    url: string,
    withPreparation = true,
  ): <T>(item: T, ids: number[]) => Observable<PaginatedResponse<T[]>> {
    return <T>(item: T, ids: number[]) => {
      const params = prepareHttpParams({ id__in: ids }, withPreparation, ['id__in']);
      return this.http.post<PaginatedResponse<T[]>>(url, { update_fields: item }, { params });
    };
  }

  /**
   * Возвращает функцию-запрос на экспорт данных с сервера
   * @param url эндпоинт на получение экспорта данных
   * @param allowedParams массив с разрешенными свойствами, например ['category', 'page', 'status']
   * @param withPreparation флаг для очистки объекта filters от свойств со значениями undefined, null и 0, по умолчанию true
   */
  protected exportMultipleItemsRequestCreator(
    url: string,
    allowedParams?: string[],
    withPreparation = true,
  ): <T>(filters: T, fields: string[], ids: number[]) => Observable<Blob> {
    return <T>(filters: T, fields: string[], ids: number[]) => {
      const params = prepareHttpParams(
        {
          id__in: ids,
          selected_fields: fields?.length ? fields : null,
          responseType: 'blob',
          observe: 'response',
          ...filters,
        },
        withPreparation,
        allowedParams?.length ? allowedParams : undefined,
      );
      return this.http.get<any>(url, {
        params,
        ...{ responseType: 'blob' as any },
      });
    };
  }
}
