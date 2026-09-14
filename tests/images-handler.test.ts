import { describe, expect, it } from 'vitest';
import { isAllowedImageHost } from '../src/main/ipc/images';

describe('isAllowedImageHost', () => {
  it('allows github.com and its attachment paths', () => {
    expect(isAllowedImageHost('github.com')).toBe(true);
  });

  it('allows any githubusercontent.com subdomain', () => {
    expect(isAllowedImageHost('user-images.githubusercontent.com')).toBe(true);
    expect(isAllowedImageHost('private-user-images.githubusercontent.com')).toBe(true);
    expect(isAllowedImageHost('avatars.githubusercontent.com')).toBe(true);
  });

  it('rejects lookalike or unrelated hosts', () => {
    expect(isAllowedImageHost('evilgithubusercontent.com')).toBe(false);
    expect(isAllowedImageHost('github.com.evil.com')).toBe(false);
    expect(isAllowedImageHost('notgithub.com')).toBe(false);
    expect(isAllowedImageHost('evil.com')).toBe(false);
  });
});
