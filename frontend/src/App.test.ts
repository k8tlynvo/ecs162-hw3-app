import { describe, it, expect, vi, beforeEach, afterEach, test } from 'vitest';
import type { Mock } from 'vitest';
import { fetchArticles } from './fetchArticles';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/svelte';
import '@testing-library/jest-dom';
import App from './App.svelte';
import { get } from 'svelte/store';
import { userStore } from './stores/user';

// Mock the components used in App.svelte
vi.mock('./lib/AccountPanel.svelte', () => ({
  default: {
    render: vi.fn(() => ({
      $$: { fragment: document.createDocumentFragment() }
    })),
    props: { user: undefined }
  }
}));

vi.mock('./lib/CommentsPanel.svelte', () => ({
  default: {
    render: vi.fn(() => ({
      $$: { fragment: document.createDocumentFragment() }
    })),
    props: { 
      articleId: undefined, 
      title: undefined, 
      user: undefined,
      userType: undefined
    }
  }
}));

// Mock the store functions
vi.mock('./stores/user', async () => {
  const actual = await vi.importActual('./stores/user');
  return {
    ...actual,
    initUser: vi.fn().mockResolvedValue(undefined)
  };
});

// App header tests
describe('App Header', () => {
  test('date in header is todays date', () => {
    render(App);
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = today.toLocaleDateString('en-US', options);
    const dateElement = screen.getByTestId('todaysDate');
    expect(dateElement.textContent).toBe(formattedDate);
  });

  it('renders login button when user is not logged in', async () => {
    userStore.set(null);

    render(App);
    await waitFor(() => {
      expect(screen.getByText('LOG IN')).toBeInTheDocument();
    });
  });
});

// --------- App Component Layout Tests ----------
describe('App Layout', () => {
  let fetchMock: Mock;
  
  beforeEach(async () => {
    // Mock fetch API response for API key
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === '/api/key') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ apiKey: 'test-api-key' })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      });
    }) as any;
    
    const module = await import('./fetchArticles');
    fetchMock = vi.spyOn(module, 'fetchArticles') as Mock;
    fetchMock.mockClear();
    
    // Clear any previous renders
    cleanup();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('applies correct layout class based on window width', async () => {
    // Desktop layout
    Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true });
    
    const { container } = render(App);
    
    // Trigger resize event
    window.dispatchEvent(new Event('resize'));
    
    await waitFor(() => {
      expect(container.querySelector('.main-desktop')).toBeInTheDocument();
    });
    
    // Tablet layout
    Object.defineProperty(window, 'innerWidth', { value: 900, configurable: true });
    window.dispatchEvent(new Event('resize'));
    
    await waitFor(() => {
      expect(container.querySelector('.main-tablet')).toBeInTheDocument();
    });
    
    // Mobile layout
    Object.defineProperty(window, 'innerWidth', { value: 600, configurable: true });
    window.dispatchEvent(new Event('resize'));
    
    await waitFor(() => {
      expect(container.querySelector('.main-mobile')).toBeInTheDocument();
    });
  });
});

// App component tests
describe('App Component', () => {
  const fakeArticles = [{
    _id: 'abc123',
    headline: 'Test Headline',
    snippet: 'This is a test snippet.',
    image: 'https://example.com/image.jpg',
    comment_count: 0
  }];

  const moreArticles = [{
    _id: 'def456',
    headline: 'Second Test Headline',
    snippet: 'This is another test snippet.',
    image: 'https://example.com/image2.jpg',
    comment_count: 0
  }];

  let fetchMock: Mock;
  
  // Helper function to simulate scrolling to bottom of page
  function simulateScroll() {
    // Mock window and document properties for scroll events
    Object.defineProperty(window, 'innerHeight', { value: 500, configurable: true });
    Object.defineProperty(window, 'scrollY', { value: 1000, configurable: true });
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 1500, configurable: true });
    
    // Dispatch scroll event
    window.dispatchEvent(new Event('scroll'));
  }

  beforeEach(async () => {
    // Mock fetch API response for API key
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === '/api/key') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ apiKey: 'test-api-key' })
        });
      }
      if (url.includes('/api/articles/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { id: 'comment1', text: 'Test comment', user: 'user@example.com' }
          ])
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      });
    }) as any;
    
    const module = await import('./fetchArticles');
    fetchMock = vi.spyOn(module, 'fetchArticles') as Mock;
    fetchMock.mockClear();
    
    // Clear any previous renders
    cleanup();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('displays "Loading articles..." initially', () => {
    // Mock fetchArticles to return a promise that never resolves
    fetchMock.mockImplementation(() => new Promise(() => {}));
    
    render(App);
    expect(screen.getByText('Loading articles...')).toBeInTheDocument();
  });

  it('displays article content when articles are loaded', async () => {
    fetchMock.mockResolvedValueOnce(fakeArticles);
    
    render(App);
    
    await waitFor(() => {
      expect(screen.getByText('Test Headline')).toBeInTheDocument();
      expect(screen.getByText('This is a test snippet.')).toBeInTheDocument();
      expect(screen.getByAltText('Test Headline')).toBeInTheDocument();
    });
  });

  it('loads more articles when user scrolls to bottom', async () => {
    // Setup fetch mocks
    fetchMock.mockImplementation(async (query, page) => {
      if (page === 0) return fakeArticles;
      if (page === 1) return moreArticles;
      return [];
    });
    
    render(App);
    
    // Wait for initial articles to load
    await waitFor(() => {
      expect(screen.getByText('Test Headline')).toBeInTheDocument();
    });
    
    // Simulate scrolling to bottom
    simulateScroll();
    
    await waitFor(() => {
      expect(screen.getByText('Second Test Headline')).toBeInTheDocument();
    });
    
    expect(fetchMock).toHaveBeenCalledWith('davis/sacramento', 1);
  });

  it('displays "Loading more articles..." when fetching additional articles', async () => {
    fetchMock.mockImplementation(async (query, page) => {
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
    
    // Check for loading message
    await waitFor(() => {
      expect(screen.getByText('Loading more articles...')).toBeInTheDocument();
    });
    
    await waitFor(() => {
      expect(screen.getByText('Second Test Headline')).toBeInTheDocument();
    });
  });

  it('appends new articles on multiple scrolls', async () => {
    const thirdArticles = [{
      _id: 'ghi789',
      headline: 'Third Article',
      snippet: '...',
      image: '',
      comment_count: 0
    }];
    
    fetchMock.mockImplementation(async (query, page) => {
      if (page === 0) return fakeArticles;
      if (page === 1) return moreArticles;
      if (page === 2) return thirdArticles;
      return [];
    });
    
    render(App);
    
    // Wait for initial articles to load
    await waitFor(() => {
      expect(screen.getByText('Test Headline')).toBeInTheDocument();
    });
    
    simulateScroll();
    
    // Wait for second set of articles
    await waitFor(() => {
      expect(screen.getByText('Second Test Headline')).toBeInTheDocument();
    });

    simulateScroll();
    
    // Wait for third set of articles
    await waitFor(() => {
      expect(screen.getByText('Third Article')).toBeInTheDocument();
    });
    
    // Check fetchArticles was called the right number of times
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
    
    await waitFor(() => {
      expect(screen.getByText('Test Headline')).toBeInTheDocument();
    });

    unmount();

    expect(removeListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(removeListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
  });
});

// test commenting functionality
describe('Comments Functionality', () => {
  const fakeArticle = {
    _id: 'abc123',
    headline: 'Test Headline',
    snippet: 'This is a test snippet.',
    image: 'https://example.com/image.jpg',
    commentCount: 5 
  };

  beforeEach(async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === '/api/key') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ apiKey: 'test-api-key' })
        });
      }
      if (url.includes('/api/articles/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { id: 'comment1', text: 'Test comment', user: 'user@example.com' }
          ])
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      });
    }) as any;
    
    const module = await import('./fetchArticles');
    vi.spyOn(module, 'fetchArticles').mockResolvedValue([fakeArticle]);
    
    // Clear any previous renders
    cleanup();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('displays comments button with correct count', async () => {
    render(App);
    
    await waitFor(() => {
      const commentsButton = screen.getByRole('button', { name: /comment icon/i });
      expect(commentsButton).toBeInTheDocument();

      expect(commentsButton.textContent?.trim()).toBe('0');
    });
  });

  it('disables comments button when user is not logged in', async () => {
    userStore.set(null);
    
    render(App);
    
    await waitFor(() => {
      const commentsButton = screen.getByRole('button', { name: /comment icon/i });
      expect(commentsButton).toBeDisabled();
      expect(commentsButton).toHaveAttribute('title', 'Please log in to view comments');
    });
  });
});