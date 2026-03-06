import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Sidebar from './Sidebar';

const mockUseAuthStore = vi.fn();

vi.mock('../../stores/authStore', () => ({
  useAuthStore: () => mockUseAuthStore(),
}));

vi.mock('../../hooks/useLanguage', () => ({
  default: () => ({
    t: (_key, fallback) => fallback,
    translateText: (value) => value,
  }),
}));

const renderSidebar = () =>
  render(
    <MemoryRouter>
      <Sidebar isOpen={true} onClose={() => {}} />
    </MemoryRouter>
  );

describe('Sidebar role-based visibility smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows translator menu and hides writer/admin-only items', () => {
    mockUseAuthStore.mockReturnValue({ user: { role: 'translator' } });
    renderSidebar();

    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Workflow Queue' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Profile' })).toBeInTheDocument();

    expect(screen.queryByRole('link', { name: 'My Posts' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'New Post' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Categories' })).not.toBeInTheDocument();
  });

  it('shows admin-only content controls for admin', () => {
    mockUseAuthStore.mockReturnValue({ user: { role: 'admin' } });
    renderSidebar();

    expect(screen.getByRole('link', { name: 'Categories' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Workflow Queue' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Comments' })).toBeInTheDocument();
  });
});
