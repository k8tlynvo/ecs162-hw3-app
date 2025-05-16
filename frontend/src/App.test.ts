import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import { fetchArticles } from './fetchArticles';
import { render, screen, waitFor, cleanup } from '@testing-library/svelte';
import '@testing-library/jest-dom';
import App from './App.svelte';

// test that fetching the articles sends the correct query and returns the expected format
describe('fetchArticles', () => {
    it('sends the correct query and returns the expected format', async () => {
    const mockResponse = {
        response: {
        // create fake article content
        docs: [{
            headline: { main: 'Article Title' },
            web_url: 'https://nytimes.com/article',
            snippet: 'Article Description',
            pub_date: '2025-04-30',
            multimedia: {
            default: {
                url: 'image.jpg'
            }
            },
        }]
        }
    }  

    // mock fetch call
    global.fetch = vi.fn(() =>
        Promise.resolve({
        json: () => Promise.resolve(mockResponse)
        })
    ) as any;

    // call fetchArticles on mock query and api key
    const query = 'davis/sacramento';
    const apiKey = 'mock-api-key';
    const page = 0;
    const result = await fetchArticles(query, apiKey);

    // check that fetch was called with correct query
    expect(fetch).toHaveBeenCalledWith(`https://api.nytimes.com/svc/search/v2/articlesearch.json?q=${encodeURIComponent(query)}&page=${page}&api-key=${apiKey}`);

    // check the returned structure is in the correct format
    expect(result).toEqual([
        {
        headline: 'Article Title',
        url: 'https://nytimes.com/article',
        snippet: 'Article Description',
        published_date: '2025-04-30',
        image: 'image.jpg'
        }
    ]);

    });

    // test that errors on fetch return an empty array
    it('handles errors on fetch', async () => {

    // mock fetch to throw an error
    global.fetch = vi.fn(() => Promise.reject('API error')) as any;

    // spy on console.error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // call fetchArticles on mock query and api key
    const result = await fetchArticles('mock-query', 'mock-api-key');

    // check that an empty array is returned on error
    expect(result).toEqual([]);

    // check that error was logged
    expect(consoleSpy).toHaveBeenCalled();

    // restore console.error
    consoleSpy.mockRestore();
    });
});

// test that the date in header is correct
test('date in header is todays date', () => {

    render(App);

    // get today's date and format it
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = today.toLocaleDateString('en-US', options);

    // check that it matches the date in the header
    const dateElement = screen.getByTestId('todaysDate');
    expect(dateElement.textContent).to.include(formattedDate);
});

describe('App Component', () => {
    const fakeApiKey = 'test-api-key';
  
    const fakeArticles = [
        {
            headline: 'Test Headline',
            snippet: 'This is a test snippet.',
            image: 'https://example.com/image.jpg'
        }
    ];
  
    const moreArticles = [
        {
            headline: 'Second Test Headline',
            snippet: 'Snippet 2',
            image: 'https://example.com/image2.jpg'
        }
    ];
  
    function simulateScroll() {
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1000 });
        Object.defineProperty(window, 'scrollY', { configurable: true, value: 1000 });
        Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 1900 });
        window.dispatchEvent(new Event('scroll'));
    }
  
    let fetchMock: Mock;
  
    beforeEach(async () => {
        vi.stubGlobal('fetch', vi.fn()
        .mockResolvedValueOnce({
            json: async () => ({ apiKey: fakeApiKey })
        } as Response)
        );

        const module = await import('./fetchArticles');
        fetchMock = vi.spyOn(module, 'fetchArticles') as Mock;

        fetchMock.mockClear();
        vi.spyOn(window, 'addEventListener');
    });
  
    afterEach(() => {
        vi.restoreAllMocks();
    });
  
    it('fetches API key and uses it in NYT API call', async () => {
        fetchMock.mockResolvedValueOnce(fakeArticles);
        render(App);
      
        await waitFor(() => {
          expect(screen.getByText('Test Headline')).toBeInTheDocument();
        });
      
        expect(fetch).toHaveBeenCalledWith('/api/key');
        expect(fetchMock).toHaveBeenCalledWith('davis/sacramento', fakeApiKey, 0);
    });
  
    it('displays "Loading articles..." initially', () => {
        render(App);
        expect(screen.getByText('Loading articles...')).toBeInTheDocument();
    });
  
    it('does not display "Loading articles..." after articles are loaded', async () => {
        fetchMock.mockResolvedValueOnce(fakeArticles);
        render(App);

        await screen.findByText('Test Headline');
        expect(screen.queryByText('Loading articles...')).toBeNull();
    });
  
    it('displays a fake article in the UI', async () => {
        fetchMock.mockResolvedValueOnce(fakeArticles);
        render(App);

        await waitFor(() => {
            expect(screen.getByText('Test Headline')).toBeInTheDocument();
        });
        
        expect(screen.getByText('This is a test snippet.')).toBeInTheDocument();
        expect(screen.getByAltText('Test Headline')).toHaveAttribute('src', 'https://example.com/image.jpg');
    });
  
    it('adds scroll event listener after loading initial articles', async () => {
        fetchMock.mockResolvedValueOnce(fakeArticles);

        render(App);

        await waitFor(() => {
            expect(screen.getByText('Test Headline')).toBeInTheDocument();
        });

        expect(window.addEventListener).toHaveBeenCalledWith('scroll', expect.any(Function));
    });

    it('loads more articles when user scrolls to bottom', async () => {
        fetchMock.mockImplementation(async (_query, _key, page) => {
            if (page === 0) return fakeArticles;
            if (page === 1) return moreArticles;
            return [];
        });

        render(App);

        await waitFor(() => {
            expect(screen.getByText('Test Headline')).toBeInTheDocument();
        });

        simulateScroll();

        await waitFor(() => {
            expect(screen.getByText((_, node) => node?.textContent === 'Second Test Headline')).toBeInTheDocument();
        });

        expect(fetchMock).toHaveBeenCalledWith('davis/sacramento', fakeApiKey, 1);
    });
  
    it('displays "Loading more articles..." when fetching additional articles', async () => {
        fetchMock.mockImplementation(async (_query, _key, page) => {
            if (page === 0) return fakeArticles;
            if (page === 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
                return moreArticles;
            }
            return [];
        });

        render(App);

        await waitFor(() => {
            expect(screen.getByText('Test Headline')).toBeInTheDocument();
        });

        simulateScroll();

        await waitFor(() => {
            expect(screen.queryByText((text) => text.includes('Loading more articles'))).toBeInTheDocument();
        });

        await waitFor(() => {
            expect(screen.getByText((_, node) => node?.textContent === 'Second Test Headline')).toBeInTheDocument();
        });
    });
});

describe('App Component Layout Class Switching', () => {
    const fakeApiKey = 'test-api-key-layout';
    const fakeArticles = [ { headline: 'Layout Test Article', snippet: 'Test snippet content', image: null, url: '', published_date: '' } ];

    let fetchMock: Mock;
    let originalFetch: typeof global.fetch;
    let originalInnerWidth: number;

    beforeEach(async () => {
        originalInnerWidth = window.innerWidth;
        originalFetch = global.fetch;

        vi.stubGlobal('fetch', vi.fn()
        .mockResolvedValueOnce({
            json: async () => ({ apiKey: fakeApiKey })
        } as Response)
        );

        const module = await import('./fetchArticles');
        fetchMock = vi.spyOn(module, 'fetchArticles') as Mock;

        fetchMock.mockClear();
        vi.spyOn(window, 'addEventListener');

        // Make window properties configurable
        Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1024 }); // Start size
        // Spy on addEventListener BEFORE rendering
        vi.spyOn(window, 'addEventListener');
        vi.spyOn(window, 'removeEventListener');
    });

    afterEach(() => {
        vi.restoreAllMocks(); // This unstubs fetch and restores spies
        window.innerWidth = originalInnerWidth;
        cleanup();
    });

    it('applies correct layout class for mobile width', async () => {
        const { container } = render(App);
        const mainElement = container.querySelector('main');

        window.innerWidth = 767;
        window.dispatchEvent(new Event('resize'));

        await waitFor(() => {
            expect(mainElement?.classList.contains('main-mobile')).toBe(true);
        });
        expect(mainElement?.classList.contains('main-tablet')).toBe(false);
        expect(mainElement?.classList.contains('main-desktop')).toBe(false);
    });

    it('applies correct layout class for tablet width', async () => {
        const { container } = render(App);
        const mainElement = container.querySelector('main');

        window.innerWidth = 1023;
        window.dispatchEvent(new Event('resize'));

        await waitFor(() => {
            expect(mainElement?.classList.contains('main-tablet')).toBe(true);
        });
        expect(mainElement?.classList.contains('main-mobile')).toBe(false);
        expect(mainElement?.classList.contains('main-desktop')).toBe(false);
    });

    it('applies correct layout class for desktop width', async () => {
        const { container } = render(App);
        const mainElement = container.querySelector('main');

        window.innerWidth = 1024;
        window.dispatchEvent(new Event('resize'));

        await waitFor(() => {
            expect(mainElement?.classList.contains('main-desktop')).toBe(true);
        });
        expect(mainElement?.classList.contains('main-mobile')).toBe(false);
        expect(mainElement?.classList.contains('main-tablet')).toBe(false);
    });
});