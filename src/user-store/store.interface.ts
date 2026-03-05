import { User } from '../types';

export interface IUserStore {
  saveUser(user: User): Promise<void>;
  getUser(telegramId: number): Promise<User | null>;
  deleteUser(telegramId: number): Promise<void>;
  getUsersByCity(city: string): Promise<User[]>;
  addUserToCity(telegramId: number, city: string): Promise<void>;
  removeUserFromCity(telegramId: number, city: string): Promise<void>;
}
