export interface NotificationPage<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalUnread: number;
  hasNext: boolean;
}
