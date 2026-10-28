import type { CreateUserDto, UpdateUserDto, UserResponseDto } from './user.dto';
import { conflict, notFound } from '../../errors/AppError';
import type { User } from './user.interface';
import * as userRepository from './user.repository';

const toResponse = (user: User): UserResponseDto => ({
  id: user.id,
  name: user.name,
  email: user.email,
  createdAt: user.createdAt.toISOString(),
});

const isUniqueViolation = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === '23505';

export const findAllUsers = async (): Promise<UserResponseDto[]> => {
  const users = await userRepository.findAll();
  return users.map(toResponse);
};

export const findUserById = async (id: number): Promise<UserResponseDto> => {
  const user = await userRepository.findById(id);
  if (!user) throw notFound(`User ${id} not found`);
  return toResponse(user);
};

export const createUser = async (dto: CreateUserDto): Promise<UserResponseDto> => {
  try {
    return toResponse(await userRepository.create(dto));
  } catch (err) {
    if (isUniqueViolation(err)) throw conflict('A user with that email already exists');
    throw err;
  }
};

export const updateUser = async (id: number, dto: UpdateUserDto): Promise<UserResponseDto> => {
  const existing = await userRepository.findById(id);
  if (!existing) throw notFound(`User ${id} not found`);

  try {
    const updated = await userRepository.update(id, {
      name: dto.name ?? existing.name,
      email: dto.email ?? existing.email,
    });
    if (!updated) throw notFound(`User ${id} not found`);
    return toResponse(updated);
  } catch (err) {
    if (isUniqueViolation(err)) throw conflict('A user with that email already exists');
    throw err;
  }
};

export const deleteUser = async (id: number): Promise<void> => {
  const deleted = await userRepository.deleteById(id);
  if (deleted === 0) throw notFound(`User ${id} not found`);
};
