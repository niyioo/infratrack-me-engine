export type Notification = {
  id: number;
  recipient: number;
  title: string;
  message: string;
  channel: string;
  is_read: boolean;
  created_at: string;
};
