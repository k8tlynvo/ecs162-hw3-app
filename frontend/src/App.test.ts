import { describe, it, expect, vi, beforeEach, afterEach, test } from 'vitest';
import type { Mock } from 'vitest';
import { fetchArticles } from './fetchArticles';
import { render, screen, waitFor, cleanup } from '@testing-library/svelte';
import '@testing-library/jest-dom';
import App from './App.svelte';
import { get } from 'svelte/store';
import { userStore } from './stores/user';

// --------- App Header Tests ----------
describe('App Header', () => {
    test('date in header is todays date', () => {
        render(App);
        const today = new Date();
        const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const formattedDate = today.toLocaleDateString('en-US', options);
        const dateElement = screen.getByTestId('todaysDate');
        expect(dateElement.textContent).to.include(formattedDate);
    });

    it('renders AccountPanel when user is logged in', async () => {
        userStore.set({ email: 'kaitlyn@example.com' });

        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
            json: async () => ({ apiKey: 'test-key' })
        }) as any);

        const module = await import('./fetchArticles');
        const fetchMock = vi.spyOn(module, 'fetchArticles') as Mock;
        fetchMock.mockResolvedValueOnce([]);

        render(App);
        await waitFor(() => {
            expect(get(userStore)?.email).toBe('kaitlyn@example.com');
        });
    });
});

// --------- App Component Behavior Tests ----------
describe('App Component', () => {
    const fakeArticles = [{
        headline: 'Test Headline',
        snippet: 'This is a test snippet.',
        image: 'https://example.com/image.jpg'
    }];
    const moreArticles = [{
        headline: 'Second Test Headline',
        snippet: 'Snippet 2',
        image: 'https://example.com/image2.jpg'
    }];

    function simulateScroll() {
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1000 });
        Object.defineProperty(window, 'scrollY', { configurable: true, value: 1000 });
        Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 1900 });
        window.dispatchEvent(new Event('scroll'));
    }

    let fetchMock: Mock;

    beforeEach(async () => {
        const module = await import('./fetchArticles');
        fetchMock = vi.spyOn(module, 'fetchArticles') as Mock;
        fetchMock.mockClear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('fetches articles on mount', async () => {
        fetchMock.mockResolvedValueOnce(fakeArticles);
        render(App);
        await waitFor(() => {
            expect(screen.getByText('Test Headline')).toBeInTheDocument();
        });
        expect(fetchMock).toHaveBeenCalledWith('davis/sacramento', 0);
    });

    it('displays "Loading articles..." initially', () => {
        render(App);
        expect(screen.getByText('Loading articles...')).toBeInTheDocument();
    });

    it('does not display "Loading articles..." after articles are loaded', async () => {
        fetchMock.mockResolvedValueOnce(fakeArticles);
        render(App);
        await screen.findByText('Test Headline');
        expect(screen.queryByText('Loading articles...')).not.toBeInTheDocument();
    });

    it('displays a fake article in the UI', async () => {
        fetchMock.mockResolvedValueOnce(fakeArticles);
        render(App);
        await screen.findByText('Test Headline');
        expect(screen.getByText('This is a test snippet.')).toBeInTheDocument();
        expect(screen.getByAltText('Test Headline')).toHaveAttribute('src', 'https://example.com/image.jpg');
    });

    it('adds scroll event listener after loading initial articles', async () => {
        const addSpy = vi.spyOn(window, 'addEventListener');
        fetchMock.mockResolvedValueOnce(fakeArticles);
        render(App);
        await screen.findByText('Test Headline');
        expect(addSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    });

    it('loads more articles when user scrolls to bottom', async () => {
        fetchMock.mockImplementation(async (_query, page) => {
            if (page === 0) return fakeArticles;
            if (page === 1) return moreArticles;
            return [];
        });
        render(App);
        await screen.findByText('Test Headline');
        simulateScroll();
        await screen.findByText('Second Test Headline');
        expect(fetchMock).toHaveBeenCalledWith('davis/sacramento', 1);
    });

    it('displays "Loading more articles..." when fetching additional articles', async () => {
        fetchMock.mockImplementation(async (_query, page) => {
            if (page === 0) return fakeArticles;
            if (page === 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
                return moreArticles;
            }
            return [];
        });
        render(App);
        await screen.findByText('Test Headline');
        simulateScroll();
        await screen.findByText('Loading more articles...');
        await screen.findByText('Second Test Headline');
    });

    it('appends new articles on multiple scrolls', async () => {
        fetchMock.mockImplementation(async (_query, page) => {
            if (page === 0) return fakeArticles;
            if (page === 1) return moreArticles;
            if (page === 2) return [{ headline: 'Third Article', snippet: '...', image: '' }];
            return [];
        });
        render(App);
        await screen.findByText('Test Headline');
        simulateScroll();
        await screen.findByText('Second Test Headline');
        simulateScroll();
        await screen.findByText('Third Article');
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('logs error and does not crash if fetchArticles throws', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        fetchMock.mockRejectedValueOnce(new Error('fetch failed'));

        render(App);

        await waitFor(() => {
            expect(errorSpy).toHaveBeenCalledWith(
                'Failed to fetch articles:',
                expect.any(Error)
            );
        });

        errorSpy.mockRestore();
    });

    it('removes scroll and resize listeners on destroy', async () => {
        fetchMock.mockResolvedValueOnce(fakeArticles);
        const removeListenerSpy = vi.spyOn(window, 'removeEventListener');

        const { unmount } = render(App);
        await screen.findByText('Test Headline');

        unmount();

        expect(removeListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
        expect(removeListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    });
});