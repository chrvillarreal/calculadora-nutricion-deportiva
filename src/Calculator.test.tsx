import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import { Calculator } from './Calculator';

afterEach(cleanup);
it('no interpreta una entrada vacía de proteína como un objetivo de cero gramos', async () => {
  render(<Calculator />);
  const user = userEvent.setup();
  await user.clear(screen.getByLabelText('Proteína (g/kg)'));
  expect(screen.getByRole('alert').textContent).toContain('inválidos');
  expect(screen.queryByText('Resultados estimados')).toBeNull();
  await user.type(screen.getByLabelText('Proteína (g/kg)'), '0');
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.getByText('Resultados estimados')).toBeTruthy();
});
