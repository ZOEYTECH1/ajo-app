/**
 * Tests for add-product screen — focused on the image picker interaction.
 *
 * What we verify:
 * 1. launchImageLibraryAsync is called with mediaTypes: 'images' (not the deprecated MediaTypeOptions enum)
 * 2. Cancelling the picker leaves imageUri null (placeholder text still visible)
 * 3. Selecting an image sets the uri (placeholder text disappears)
 * 4. handleSave validates required fields before calling the mutation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

// ── Module mocks ───────────────────────────────────────────────────────────────

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ catId: '1' }),
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

const mockMutate = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(() => ({
    data: [{ id: 1, name: 'Drinks', custom_field_defs: [], product_count: 0 }],
  })),
  useMutation: jest.fn(() => ({ mutate: mockMutate, isPending: false })),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
}));

jest.mock('expo-camera', () => ({
  CameraView: ({ children }: any) => children ?? null,
  useCameraPermissions: () => [{ granted: false }, jest.fn()],
}));

jest.mock('../../src/services/inventoryService', () => ({
  getCategories: jest.fn(() => Promise.resolve([{ id: 1, name: 'Drinks', custom_field_defs: [], product_count: 0 }])),
  createProduct: jest.fn(),
}));

jest.mock('../../src/services/api', () => ({
  __esModule: true,
  default: { patch: jest.fn(() => Promise.resolve({ data: {} })) },
}));

jest.mock('../../src/utils/inventoryHelpers', () => ({
  getCategoryEmoji: () => '🥤',
}));

jest.mock('expo-image-picker');

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockLaunch = ImagePicker.launchImageLibraryAsync as jest.MockedFunction<
  typeof ImagePicker.launchImageLibraryAsync
>;

// Import AFTER all mocks
import AddProductScreen from '../../app/inventory/[catId]/add-product';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AddProductScreen — image picker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls launchImageLibraryAsync with mediaTypes: "images" (not the deprecated enum)', async () => {
    mockLaunch.mockResolvedValueOnce({ canceled: true, assets: [] });

    // render is async in @testing-library/react-native v14
    await render(<AddProductScreen />);

    fireEvent.press(screen.getByText('Tap to add photo'));

    await waitFor(() => {
      expect(mockLaunch).toHaveBeenCalledTimes(1);
    });

    const callArgs = mockLaunch.mock.calls[0][0];
    // Must be the plain string, NOT the deprecated MediaTypeOptions enum object
    expect(callArgs?.mediaTypes).toBe('images');
  });

  it('passes correct options: allowsEditing true, aspect [1,1], quality 0.7', async () => {
    mockLaunch.mockResolvedValueOnce({ canceled: true, assets: [] });

    await render(<AddProductScreen />);
    fireEvent.press(screen.getByText('Tap to add photo'));

    await waitFor(() => expect(mockLaunch).toHaveBeenCalledTimes(1));

    const callArgs = mockLaunch.mock.calls[0][0];
    expect(callArgs?.allowsEditing).toBe(true);
    expect(callArgs?.aspect).toEqual([1, 1]);
    expect(callArgs?.quality).toBe(0.7);
  });

  it('keeps placeholder visible when user cancels the picker', async () => {
    mockLaunch.mockResolvedValueOnce({ canceled: true, assets: [] });

    await render(<AddProductScreen />);
    fireEvent.press(screen.getByText('Tap to add photo'));

    await waitFor(() => expect(mockLaunch).toHaveBeenCalledTimes(1));

    // Placeholder text should still be visible — no image was chosen
    expect(screen.getByText('Tap to add photo')).toBeTruthy();
  });

  it('hides placeholder and shows image after a successful pick', async () => {
    const fakeUri = 'file:///data/user/0/com.test/cache/product.jpg';
    mockLaunch.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: fakeUri, width: 100, height: 100, type: 'image', fileName: 'product.jpg', fileSize: 1234 }],
    });

    await render(<AddProductScreen />);
    fireEvent.press(screen.getByText('Tap to add photo'));

    await waitFor(() => {
      expect(screen.queryByText('Tap to add photo')).toBeNull();
    });
  });
});

describe('AddProductScreen — form validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not call mutation when name is empty', async () => {
    await render(<AddProductScreen />);
    fireEvent.press(screen.getByText('Save Product'));
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('does not call mutation when price is missing', async () => {
    await render(<AddProductScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText('e.g. Indomie noodles, Blue T-shirt...'),
      'Test Product',
    );
    fireEvent.press(screen.getByText('Save Product'));

    expect(mockMutate).not.toHaveBeenCalled();
  });
});
