/* ═══════════════════════════════════════════════════════════════
   topicFillSnippets.js — third wave, aimed at thin topics
   ─────────────────────────────────────────────────────────────
   90 snippets (30 per language) written specifically to fill the
   language x topic cells the first two waves left almost empty.
   Before this file, C++ had exactly ONE async snippet, and heap,
   recursion and OOP sat at 10-13 entries across all three
   languages — thin enough that choosing those topics in the filter
   returned the same handful of snippets over and over.

   topic / tags / difficulty are stamped by scripts/labelSnippets.cjs
   so the labels agree with the rest of the corpus.

   AUTHORING RULES — snippets live inside template literals, so the
   code must never contain a backtick, a "${" or a backslash.
   ═══════════════════════════════════════════════════════════════ */

const topicFillSnippets = [
  /* ═══════════════════════════════════════════════════════════
     C++ — async, heap, OOP, recursion, functional, searching
     ═══════════════════════════════════════════════════════════ */

  {
    id: "cpp-t-1",
    title: "Thread Join Parallel Sum",
    language: "C++",
    length: "long",
    topic: "async",
    tags: ["timing"],
    difficulty: "hard",
    code: `long long parallelSum(const vector<int>& nums, int workers) {
  vector<thread> pool;
  vector<long long> partial(workers, 0);
  int chunk = nums.size() / workers + 1;

  for (int w = 0; w < workers; w++) {
    pool.emplace_back([&, w]() {
      int start = w * chunk;
      int stop = min((int)nums.size(), start + chunk);
      for (int i = start; i < stop; i++) partial[w] += nums[i];
    });
  }
  for (thread& t : pool) t.join();

  long long total = 0;
  for (long long p : partial) total += p;
  return total;
}`,
  },
  {
    id: "cpp-t-2",
    title: "Atomic Counter Increment",
    language: "C++",
    length: "medium",
    topic: "async",
    tags: ["concurrency"],
    difficulty: "medium",
    code: `atomic<int> hits{0};

void recordHit() {
  hits.fetch_add(1, memory_order_relaxed);
}

int totalHits() {
  return hits.load(memory_order_acquire);
}`,
  },
  {
    id: "cpp-t-3",
    title: "Future Async Task",
    language: "C++",
    length: "medium",
    topic: "async",
    tags: ["timing"],
    difficulty: "medium",
    code: `int computeSlowly(int seed) {
  this_thread::sleep_for(chrono::milliseconds(50));
  return seed * seed;
}

int runAsync(int seed) {
  future<int> job = async(launch::async, computeSlowly, seed);
  return job.get();
}`,
  },
  {
    id: "cpp-t-4",
    title: "Condition Variable Wait",
    language: "C++",
    length: "long",
    topic: "async",
    tags: ["concurrency"],
    difficulty: "hard",
    code: `mutex m;
condition_variable cv;
queue<int> jobs;
bool finished = false;

void produce(int value) {
  {
    lock_guard<mutex> lock(m);
    jobs.push(value);
  }
  cv.notify_one();
}

int consume() {
  unique_lock<mutex> lock(m);
  cv.wait(lock, [] { return !jobs.empty() || finished; });
  if (jobs.empty()) return -1;
  int value = jobs.front();
  jobs.pop();
  return value;
}`,
  },
  {
    id: "cpp-t-5",
    title: "Producer Consumer Buffer",
    language: "C++",
    length: "long",
    topic: "async",
    tags: ["concurrency"],
    difficulty: "hard",
    code: `template <typename T>
class Channel {
  queue<T> items;
  mutex m;
  condition_variable cv;

public:
  void send(T value) {
    {
      lock_guard<mutex> lock(m);
      items.push(move(value));
    }
    cv.notify_one();
  }

  T receive() {
    unique_lock<mutex> lock(m);
    cv.wait(lock, [this] { return !items.empty(); });
    T value = move(items.front());
    items.pop();
    return value;
  }
};`,
  },
  {
    id: "cpp-t-6",
    title: "Heapify Array In Place",
    language: "C++",
    length: "medium",
    topic: "heap",
    tags: ["data-structures"],
    difficulty: "hard",
    code: `void heapify(vector<int>& a, int n, int root) {
  int largest = root;
  int l = 2 * root + 1, r = 2 * root + 2;
  if (l < n && a[l] > a[largest]) largest = l;
  if (r < n && a[r] > a[largest]) largest = r;
  if (largest != root) {
    swap(a[root], a[largest]);
    heapify(a, n, largest);
  }
}`,
  },
  {
    id: "cpp-t-7",
    title: "K Largest With Min Heap",
    language: "C++",
    length: "medium",
    topic: "heap",
    tags: ["data-structures"],
    difficulty: "hard",
    code: `vector<int> kLargest(vector<int>& nums, int k) {
  priority_queue<int, vector<int>, greater<int>> keep;
  for (int x : nums) {
    keep.push(x);
    if ((int)keep.size() > k) keep.pop();
  }
  vector<int> out;
  while (!keep.empty()) {
    out.push_back(keep.top());
    keep.pop();
  }
  reverse(out.begin(), out.end());
  return out;
}`,
  },
  {
    id: "cpp-t-8",
    title: "Running Median Two Heaps",
    language: "C++",
    length: "long",
    topic: "heap",
    tags: ["data-structures"],
    difficulty: "hard",
    code: `class RunningMedian {
  priority_queue<int> low;
  priority_queue<int, vector<int>, greater<int>> high;

public:
  void add(int value) {
    low.push(value);
    high.push(low.top());
    low.pop();
    if (high.size() > low.size()) {
      low.push(high.top());
      high.pop();
    }
  }

  double median() const {
    if (low.size() == high.size())
      return (low.top() + high.top()) / 2.0;
    return low.top();
  }
};`,
  },
  {
    id: "cpp-t-9",
    title: "Singleton Logger Class",
    language: "C++",
    length: "long",
    topic: "oop",
    tags: ["patterns"],
    difficulty: "hard",
    code: `class Logger {
  vector<string> lines;
  Logger() {}

public:
  Logger(const Logger&) = delete;
  Logger& operator=(const Logger&) = delete;

  static Logger& instance() {
    static Logger only;
    return only;
  }

  void log(const string& message) {
    lines.push_back(message);
  }

  size_t count() const { return lines.size(); }
};`,
  },
  {
    id: "cpp-t-10",
    title: "Operator Overloading Vector2",
    language: "C++",
    length: "medium",
    topic: "oop",
    tags: ["patterns"],
    difficulty: "medium",
    code: `struct Vec2 {
  double x = 0, y = 0;

  Vec2 operator+(const Vec2& o) const { return {x + o.x, y + o.y}; }
  Vec2 operator-(const Vec2& o) const { return {x - o.x, y - o.y}; }
  Vec2 operator*(double k) const { return {x * k, y * k}; }

  bool operator==(const Vec2& o) const {
    return x == o.x && y == o.y;
  }

  double length() const { return sqrt(x * x + y * y); }
};`,
  },
  {
    id: "cpp-t-11",
    title: "Observer Pattern Class",
    language: "C++",
    length: "medium",
    topic: "oop",
    tags: ["patterns"],
    difficulty: "medium",
    code: `class Subject {
  vector<function<void(int)>> observers;

public:
  void subscribe(function<void(int)> fn) {
    observers.push_back(move(fn));
  }

  void publish(int value) {
    for (auto& fn : observers) fn(value);
  }

  size_t observerCount() const { return observers.size(); }
};`,
  },
  {
    id: "cpp-t-12",
    title: "Ackermann Function",
    language: "C++",
    length: "short",
    topic: "recursion",
    tags: ["backtracking"],
    difficulty: "easy",
    code: `int ackermann(int m, int n) {
  if (m == 0) return n + 1;
  if (n == 0) return ackermann(m - 1, 1);
  return ackermann(m - 1, ackermann(m, n - 1));
}`,
  },
  {
    id: "cpp-t-13",
    title: "Subset Sum Backtracking",
    language: "C++",
    length: "long",
    topic: "recursion",
    tags: ["backtracking"],
    difficulty: "hard",
    code: `bool subsetSum(vector<int>& nums, int index, int target) {
  if (target == 0) return true;
  if (index >= (int)nums.size() || target < 0) return false;
  if (subsetSum(nums, index + 1, target - nums[index])) return true;
  return subsetSum(nums, index + 1, target);
}

vector<vector<int>> allSubsetsSumming(vector<int>& nums, int target) {
  vector<vector<int>> out;
  vector<int> current;

  function<void(int, int)> walk = [&](int i, int left) {
    if (left == 0) { out.push_back(current); return; }
    if (i >= (int)nums.size() || left < 0) return;
    current.push_back(nums[i]);
    walk(i + 1, left - nums[i]);
    current.pop_back();
    walk(i + 1, left);
  };

  walk(0, target);
  return out;
}`,
  },
  {
    id: "cpp-t-14",
    title: "Generate Parentheses Backtracking",
    language: "C++",
    length: "medium",
    topic: "recursion",
    tags: ["backtracking"],
    difficulty: "medium",
    code: `void build(int open, int close, string current,
           vector<string>& out) {
  if (open == 0 && close == 0) { out.push_back(current); return; }
  if (open > 0) build(open - 1, close + 1, current + "(", out);
  if (close > 0) build(open, close - 1, current + ")", out);
}

vector<string> generate(int pairs) {
  vector<string> out;
  build(pairs, 0, "", out);
  return out;
}`,
  },
  {
    id: "cpp-t-15",
    title: "Partition Function Recursion",
    language: "C++",
    length: "medium",
    topic: "recursion",
    tags: ["backtracking"],
    difficulty: "medium",
    code: `int partitions(int n, int maxPart) {
  if (n == 0) return 1;
  if (n < 0 || maxPart == 0) return 0;
  return partitions(n - maxPart, maxPart) +
         partitions(n, maxPart - 1);
}`,
  },
  {
    id: "cpp-t-16",
    title: "Partial Sum Scan",
    language: "C++",
    length: "short",
    topic: "functional",
    tags: ["idioms"],
    difficulty: "easy",
    code: `vector<int> runningTotals(const vector<int>& src) {
  vector<int> out(src.size());
  partial_sum(src.begin(), src.end(), out.begin());
  return out;
}`,
  },
  {
    id: "cpp-t-17",
    title: "Any Of All Of Predicates",
    language: "C++",
    length: "medium",
    topic: "functional",
    tags: ["idioms"],
    difficulty: "medium",
    code: `bool hasNegative(const vector<int>& nums) {
  return any_of(nums.begin(), nums.end(),
                [](int x) { return x < 0; });
}

bool allPositive(const vector<int>& nums) {
  return all_of(nums.begin(), nums.end(),
                [](int x) { return x > 0; });
}`,
  },
  {
    id: "cpp-t-18",
    title: "Sort With Custom Comparator",
    language: "C++",
    length: "medium",
    topic: "functional",
    tags: ["idioms"],
    difficulty: "medium",
    code: `void sortByLengthThenAlpha(vector<string>& words) {
  sort(words.begin(), words.end(),
       [](const string& a, const string& b) {
         if (a.size() != b.size()) return a.size() < b.size();
         return a < b;
       });
}`,
  },
  {
    id: "cpp-t-19",
    title: "Ternary Search Unimodal",
    language: "C++",
    length: "medium",
    topic: "searching",
    tags: ["arrays"],
    difficulty: "medium",
    code: `double ternarySearch(function<double(double)> f,
                     double lo, double hi) {
  for (int step = 0; step < 200; step++) {
    double m1 = lo + (hi - lo) / 3.0;
    double m2 = hi - (hi - lo) / 3.0;
    if (f(m1) < f(m2)) lo = m1;
    else hi = m2;
  }
  return (lo + hi) / 2.0;
}`,
  },
  {
    id: "cpp-t-20",
    title: "Exponential Search",
    language: "C++",
    length: "long",
    topic: "searching",
    tags: ["arrays"],
    difficulty: "hard",
    code: `int exponentialSearch(vector<int>& a, int target) {
  if (a.empty()) return -1;
  if (a[0] == target) return 0;

  int bound = 1;
  while (bound < (int)a.size() && a[bound] < target) bound *= 2;

  int lo = bound / 2;
  int hi = min(bound, (int)a.size() - 1);
  while (lo <= hi) {
    int mid = lo + (hi - lo) / 2;
    if (a[mid] == target) return mid;
    if (a[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}`,
  },
  {
    id: "cpp-t-21",
    title: "Jump Search",
    language: "C++",
    length: "medium",
    topic: "searching",
    tags: ["arrays"],
    difficulty: "medium",
    code: `int jumpSearch(vector<int>& a, int target) {
  int n = a.size();
  int step = (int)sqrt(n);
  int prev = 0;
  while (prev < n && a[min(step, n) - 1] < target) {
    prev = step;
    step += (int)sqrt(n);
    if (prev >= n) return -1;
  }
  for (int i = prev; i < min(step, n); i++)
    if (a[i] == target) return i;
  return -1;
}`,
  },
  {
    id: "cpp-t-22",
    title: "Matrix Identity Builder",
    language: "C++",
    length: "short",
    topic: "matrix",
    tags: ["arrays"],
    difficulty: "easy",
    code: `vector<vector<int>> identity(int n) {
  vector<vector<int>> m(n, vector<int>(n, 0));
  for (int i = 0; i < n; i++) m[i][i] = 1;
  return m;
}`,
  },
  {
    id: "cpp-t-23",
    title: "Matrix Boundary Sum",
    language: "C++",
    length: "medium",
    topic: "matrix",
    tags: ["arrays"],
    difficulty: "medium",
    code: `int boundarySum(vector<vector<int>>& m) {
  int rows = m.size();
  if (rows == 0) return 0;
  int cols = m[0].size(), total = 0;
  for (int i = 0; i < rows; i++)
    for (int j = 0; j < cols; j++)
      if (i == 0 || j == 0 || i == rows - 1 || j == cols - 1)
        total += m[i][j];
  return total;
}`,
  },
  {
    id: "cpp-t-24",
    title: "Group Anagrams Hash Map",
    language: "C++",
    length: "medium",
    topic: "hashing",
    tags: ["counting"],
    difficulty: "medium",
    code: `vector<vector<string>> groupAnagrams(vector<string>& words) {
  unordered_map<string, vector<string>> buckets;
  for (const string& w : words) {
    string key = w;
    sort(key.begin(), key.end());
    buckets[key].push_back(w);
  }
  vector<vector<string>> out;
  for (auto& entry : buckets) out.push_back(entry.second);
  return out;
}`,
  },
  {
    id: "cpp-t-25",
    title: "Longest Consecutive Sequence Hash",
    language: "C++",
    length: "medium",
    topic: "hashing",
    tags: ["counting"],
    difficulty: "medium",
    code: `int longestConsecutive(vector<int>& nums) {
  unordered_set<int> pool(nums.begin(), nums.end());
  int best = 0;
  for (int x : pool) {
    if (pool.count(x - 1)) continue;
    int run = 1, current = x;
    while (pool.count(current + 1)) {
      current++;
      run++;
    }
    best = max(best, run);
  }
  return best;
}`,
  },
  {
    id: "cpp-t-26",
    title: "House Robber DP",
    language: "C++",
    length: "medium",
    topic: "dp",
    tags: ["optimisation"],
    difficulty: "hard",
    code: `int rob(vector<int>& houses) {
  int prev = 0, curr = 0;
  for (int money : houses) {
    int take = prev + money;
    prev = curr;
    curr = max(curr, take);
  }
  return curr;
}`,
  },
  {
    id: "cpp-t-27",
    title: "Unique Paths Grid DP",
    language: "C++",
    length: "medium",
    topic: "dp",
    tags: ["optimisation"],
    difficulty: "hard",
    code: `int uniquePaths(int rows, int cols) {
  vector<int> row(cols, 1);
  for (int i = 1; i < rows; i++)
    for (int j = 1; j < cols; j++)
      row[j] += row[j - 1];
  return row[cols - 1];
}`,
  },
  {
    id: "cpp-t-28",
    title: "Tree Diameter Recursion",
    language: "C++",
    length: "medium",
    topic: "trees",
    tags: ["recursion"],
    difficulty: "hard",
    code: `int diameter = 0;

int depth(TreeNode* node) {
  if (!node) return 0;
  int left = depth(node->left);
  int right = depth(node->right);
  diameter = max(diameter, left + right);
  return 1 + max(left, right);
}

int treeDiameter(TreeNode* root) {
  diameter = 0;
  depth(root);
  return diameter;
}`,
  },
  {
    id: "cpp-t-29",
    title: "Invert Binary Tree",
    language: "C++",
    length: "medium",
    topic: "trees",
    tags: ["recursion"],
    difficulty: "hard",
    code: `TreeNode* invert(TreeNode* node) {
  if (!node) return nullptr;
  swap(node->left, node->right);
  invert(node->left);
  invert(node->right);
  return node;
}`,
  },
  {
    id: "cpp-t-30",
    title: "String Compression Run Length",
    language: "C++",
    length: "long",
    topic: "strings",
    tags: ["text"],
    difficulty: "hard",
    code: `string compress(const string& s) {
  if (s.empty()) return "";
  string out = "";
  char current = s[0];
  int run = 1;
  for (size_t i = 1; i <= s.size(); i++) {
    if (i < s.size() && s[i] == current) {
      run++;
    } else {
      out += current;
      out += to_string(run);
      if (i < s.size()) {
        current = s[i];
        run = 1;
      }
    }
  }
  return out.size() < s.size() ? out : s;
}`,
  },
  /* ═══════════════════════════════════════════════════════════
     Python
     ═══════════════════════════════════════════════════════════ */

  {
    id: "py-t-1",
    title: "Thread Pool Executor Map",
    language: "Python",
    length: "medium",
    topic: "async",
    tags: ["timing"],
    difficulty: "medium",
    code: `from concurrent.futures import ThreadPoolExecutor


def parallel_squares(numbers, workers=4):
    with ThreadPoolExecutor(max_workers=workers) as pool:
        return list(pool.map(lambda n: n * n, numbers))`,
  },
  {
    id: "py-t-2",
    title: "Async Semaphore Limit",
    language: "Python",
    length: "medium",
    topic: "async",
    tags: ["timing"],
    difficulty: "medium",
    code: `import asyncio


async def limited_fetch(name, gate):
    async with gate:
        await asyncio.sleep(0.05)
        return name + " ok"


async def run_limited(names, limit=2):
    gate = asyncio.Semaphore(limit)
    tasks = [limited_fetch(n, gate) for n in names]
    return await asyncio.gather(*tasks)`,
  },
  {
    id: "py-t-3",
    title: "Async Timeout Guard",
    language: "Python",
    length: "medium",
    topic: "async",
    tags: ["timing"],
    difficulty: "medium",
    code: `import asyncio


async def with_timeout(coro, seconds):
    try:
        return await asyncio.wait_for(coro, timeout=seconds)
    except asyncio.TimeoutError:
        return None`,
  },
  {
    id: "py-t-4",
    title: "Heapify List In Place",
    language: "Python",
    length: "medium",
    topic: "heap",
    tags: ["data-structures"],
    difficulty: "hard",
    code: `import heapq


def to_heap(values):
    heap = list(values)
    heapq.heapify(heap)
    return heap`,
  },
  {
    id: "py-t-5",
    title: "K Largest With Min Heap",
    language: "Python",
    length: "medium",
    topic: "heap",
    tags: ["data-structures"],
    difficulty: "hard",
    code: `import heapq


def k_largest(nums, k):
    keep = []
    for value in nums:
        heapq.heappush(keep, value)
        if len(keep) > k:
            heapq.heappop(keep)
    return sorted(keep, reverse=True)`,
  },
  {
    id: "py-t-6",
    title: "Running Median Two Heaps",
    language: "Python",
    length: "long",
    topic: "heap",
    tags: ["data-structures"],
    difficulty: "hard",
    code: `import heapq


class RunningMedian:
    def __init__(self):
        self.low = []
        self.high = []

    def add(self, value):
        heapq.heappush(self.low, -value)
        heapq.heappush(self.high, -heapq.heappop(self.low))
        if len(self.high) > len(self.low):
            heapq.heappush(self.low, -heapq.heappop(self.high))

    def median(self):
        if len(self.low) == len(self.high):
            return (-self.low[0] + self.high[0]) / 2
        return -self.low[0]`,
  },
  {
    id: "py-t-7",
    title: "Singleton Config Class",
    language: "Python",
    length: "medium",
    topic: "oop",
    tags: ["patterns"],
    difficulty: "medium",
    code: `class Config:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.values = {}
        return cls._instance

    def set(self, key, value):
        self.values[key] = value
        return self

    def get(self, key, fallback=None):
        return self.values.get(key, fallback)`,
  },
  {
    id: "py-t-8",
    title: "Observer Pattern Class",
    language: "Python",
    length: "medium",
    topic: "oop",
    tags: ["patterns"],
    difficulty: "medium",
    code: `class Subject:
    def __init__(self):
        self._observers = []

    def subscribe(self, callback):
        self._observers.append(callback)

        def unsubscribe():
            self._observers.remove(callback)

        return unsubscribe

    def publish(self, payload):
        for callback in list(self._observers):
            callback(payload)`,
  },
  {
    id: "py-t-9",
    title: "Operator Overloading Vector2",
    language: "Python",
    length: "long",
    topic: "oop",
    tags: ["patterns"],
    difficulty: "hard",
    code: `class Vec2:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __add__(self, other):
        return Vec2(self.x + other.x, self.y + other.y)

    def __mul__(self, k):
        return Vec2(self.x * k, self.y * k)

    def __eq__(self, other):
        return self.x == other.x and self.y == other.y

    def __repr__(self):
        return "Vec2(" + str(self.x) + ", " + str(self.y) + ")"`,
  },
  {
    id: "py-t-10",
    title: "Ackermann Function",
    language: "Python",
    length: "medium",
    topic: "recursion",
    tags: ["backtracking"],
    difficulty: "medium",
    code: `def ackermann(m, n):
    if m == 0:
        return n + 1
    if n == 0:
        return ackermann(m - 1, 1)
    return ackermann(m - 1, ackermann(m, n - 1))`,
  },
  {
    id: "py-t-11",
    title: "Subset Sum Backtracking",
    language: "Python",
    length: "medium",
    topic: "recursion",
    tags: ["backtracking"],
    difficulty: "medium",
    code: `def subset_sum(nums, target, index=0):
    if target == 0:
        return True
    if index >= len(nums) or target < 0:
        return False
    if subset_sum(nums, target - nums[index], index + 1):
        return True
    return subset_sum(nums, target, index + 1)`,
  },
  {
    id: "py-t-12",
    title: "Generate Parentheses Backtracking",
    language: "Python",
    length: "medium",
    topic: "recursion",
    tags: ["backtracking"],
    difficulty: "medium",
    code: `def generate_parentheses(pairs):
    out = []

    def build(current, open_left, close_left):
        if open_left == 0 and close_left == 0:
            out.append(current)
            return
        if open_left > 0:
            build(current + "(", open_left - 1, close_left + 1)
        if close_left > 0:
            build(current + ")", open_left, close_left - 1)

    build("", pairs, 0)
    return out`,
  },
  {
    id: "py-t-13",
    title: "Exponential Search",
    language: "Python",
    length: "long",
    topic: "searching",
    tags: ["arrays"],
    difficulty: "hard",
    code: `def exponential_search(items, target):
    if not items:
        return -1
    if items[0] == target:
        return 0

    bound = 1
    while bound < len(items) and items[bound] < target:
        bound *= 2

    lo = bound // 2
    hi = min(bound, len(items) - 1)
    while lo <= hi:
        mid = (lo + hi) // 2
        if items[mid] == target:
            return mid
        if items[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1`,
  },
  {
    id: "py-t-14",
    title: "Jump Search",
    language: "Python",
    length: "medium",
    topic: "searching",
    tags: ["arrays"],
    difficulty: "medium",
    code: `def jump_search(items, target):
    n = len(items)
    step = int(n ** 0.5) or 1
    prev = 0
    while prev < n and items[min(step, n) - 1] < target:
        prev = step
        step += int(n ** 0.5) or 1
        if prev >= n:
            return -1
    for i in range(prev, min(step, n)):
        if items[i] == target:
            return i
    return -1`,
  },
  {
    id: "py-t-15",
    title: "Bisect Insert Position",
    language: "Python",
    length: "short",
    topic: "searching",
    tags: ["arrays"],
    difficulty: "easy",
    code: `import bisect


def insert_position(items, value):
    return bisect.bisect_left(items, value)`,
  },
  {
    id: "py-t-16",
    title: "Count Set Bits Table",
    language: "Python",
    length: "short",
    topic: "bits",
    tags: ["binary"],
    difficulty: "easy",
    code: `def bit_counts(limit):
    return [bin(i).count("1") for i in range(limit + 1)]`,
  },
  {
    id: "py-t-17",
    title: "Single Number XOR",
    language: "Python",
    length: "short",
    topic: "bits",
    tags: ["binary"],
    difficulty: "easy",
    code: `def single_number(nums):
    result = 0
    for n in nums:
        result ^= n
    return result`,
  },
  {
    id: "py-t-18",
    title: "House Robber DP",
    language: "Python",
    length: "short",
    topic: "dp",
    tags: ["optimisation"],
    difficulty: "medium",
    code: `def rob(houses):
    prev, curr = 0, 0
    for money in houses:
        prev, curr = curr, max(curr, prev + money)
    return curr`,
  },
  {
    id: "py-t-19",
    title: "Unique Paths Grid DP",
    language: "Python",
    length: "medium",
    topic: "dp",
    tags: ["optimisation"],
    difficulty: "hard",
    code: `def unique_paths(rows, cols):
    row = [1] * cols
    for _ in range(1, rows):
        for j in range(1, cols):
            row[j] += row[j - 1]
    return row[cols - 1]`,
  },
  {
    id: "py-t-20",
    title: "Invert Binary Tree",
    language: "Python",
    length: "medium",
    topic: "trees",
    tags: ["recursion"],
    difficulty: "hard",
    code: `def invert(node):
    if node is None:
        return None
    node.left, node.right = node.right, node.left
    invert(node.left)
    invert(node.right)
    return node`,
  },
  {
    id: "py-t-21",
    title: "Tree Diameter Recursion",
    language: "Python",
    length: "medium",
    topic: "trees",
    tags: ["recursion"],
    difficulty: "hard",
    code: `def tree_diameter(root):
    best = 0

    def depth(node):
        nonlocal best
        if node is None:
            return 0
        left = depth(node.left)
        right = depth(node.right)
        best = max(best, left + right)
        return 1 + max(left, right)

    depth(root)
    return best`,
  },
  {
    id: "py-t-22",
    title: "Linked List Insert Sorted",
    language: "Python",
    length: "medium",
    topic: "linked-list",
    tags: ["pointers"],
    difficulty: "medium",
    code: `def insert_sorted(head, value):
    node = ListNode(value)
    if head is None or value <= head.val:
        node.next = head
        return node

    current = head
    while current.next is not None and current.next.val < value:
        current = current.next
    node.next = current.next
    current.next = node
    return head`,
  },
  {
    id: "py-t-23",
    title: "Linked List Remove Duplicates",
    language: "Python",
    length: "medium",
    topic: "linked-list",
    tags: ["pointers"],
    difficulty: "medium",
    code: `def remove_duplicates(head):
    seen = set()
    current = head
    previous = None
    while current is not None:
        if current.val in seen:
            previous.next = current.next
        else:
            seen.add(current.val)
            previous = current
        current = current.next
    return head`,
  },
  {
    id: "py-t-24",
    title: "Group Anagrams Hash Map",
    language: "Python",
    length: "medium",
    topic: "hashing",
    tags: ["counting"],
    difficulty: "medium",
    code: `def group_anagrams(words):
    buckets = {}
    for word in words:
        key = "".join(sorted(word))
        buckets.setdefault(key, []).append(word)
    return list(buckets.values())`,
  },
  {
    id: "py-t-25",
    title: "Longest Consecutive Sequence Hash",
    language: "Python",
    length: "medium",
    topic: "hashing",
    tags: ["counting"],
    difficulty: "medium",
    code: `def longest_consecutive(nums):
    pool = set(nums)
    best = 0
    for value in pool:
        if value - 1 in pool:
            continue
        run, current = 1, value
        while current + 1 in pool:
            current += 1
            run += 1
        best = max(best, run)
    return best`,
  },
  {
    id: "py-t-26",
    title: "Matrix Identity Builder",
    language: "Python",
    length: "short",
    topic: "matrix",
    tags: ["arrays"],
    difficulty: "easy",
    code: `def identity(n):
    return [[1 if i == j else 0 for j in range(n)] for i in range(n)]`,
  },
  {
    id: "py-t-27",
    title: "Matrix Boundary Sum",
    language: "Python",
    length: "medium",
    topic: "matrix",
    tags: ["arrays"],
    difficulty: "medium",
    code: `def boundary_sum(matrix):
    rows = len(matrix)
    if rows == 0:
        return 0
    cols = len(matrix[0])
    total = 0
    for i in range(rows):
        for j in range(cols):
            if i in (0, rows - 1) or j in (0, cols - 1):
                total += matrix[i][j]
    return total`,
  },
  {
    id: "py-t-28",
    title: "String Compression Run Length",
    language: "Python",
    length: "medium",
    topic: "strings",
    tags: ["text"],
    difficulty: "medium",
    code: `def compress(text):
    if not text:
        return ""
    parts = []
    current, run = text[0], 1
    for ch in text[1:]:
        if ch == current:
            run += 1
        else:
            parts.append(current + str(run))
            current, run = ch, 1
    parts.append(current + str(run))
    out = "".join(parts)
    return out if len(out) < len(text) else text`,
  },
  {
    id: "py-t-29",
    title: "Caesar Cipher Shift",
    language: "Python",
    length: "medium",
    topic: "strings",
    tags: ["text"],
    difficulty: "medium",
    code: `def caesar(text, shift):
    out = []
    for ch in text:
        if ch.isalpha():
            base = ord("A") if ch.isupper() else ord("a")
            out.append(chr((ord(ch) - base + shift) % 26 + base))
        else:
            out.append(ch)
    return "".join(out)`,
  },
  {
    id: "py-t-30",
    title: "Graph Has Path DFS",
    language: "Python",
    length: "medium",
    topic: "graphs",
    tags: ["traversal"],
    difficulty: "hard",
    code: `def has_path(graph, start, goal, seen=None):
    if seen is None:
        seen = set()
    if start == goal:
        return True
    seen.add(start)
    for nxt in graph.get(start, []):
        if nxt not in seen and has_path(graph, nxt, goal, seen):
            return True
    return False`,
  },

  /* ═══════════════════════════════════════════════════════════
     JavaScript
     ═══════════════════════════════════════════════════════════ */

  {
    id: "js-t-1",
    title: "Binary Heap Class",
    language: "JavaScript",
    length: "long",
    topic: "heap",
    tags: ["data-structures"],
    difficulty: "hard",
    code: `class BinaryHeap {
  constructor(compare = (a, b) => a - b) {
    this.items = [];
    this.compare = compare;
  }

  push(value) {
    this.items.push(value);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.compare(this.items[parent], this.items[i]) <= 0) break;
      [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]];
      i = parent;
    }
  }

  pop() {
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0) {
      this.items[0] = last;
      this.sink(0);
    }
    return top;
  }

  sink(i) {
    const n = this.items.length;
    for (;;) {
      let best = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n && this.compare(this.items[l], this.items[best]) < 0) best = l;
      if (r < n && this.compare(this.items[r], this.items[best]) < 0) best = r;
      if (best === i) return;
      [this.items[i], this.items[best]] = [this.items[best], this.items[i]];
      i = best;
    }
  }
}`,
  },
  {
    id: "js-t-2",
    title: "Heapify Array In Place",
    language: "JavaScript",
    length: "medium",
    topic: "heap",
    tags: ["data-structures"],
    difficulty: "hard",
    code: `function heapify(arr, n, root) {
  let largest = root;
  const l = 2 * root + 1;
  const r = 2 * root + 2;
  if (l < n && arr[l] > arr[largest]) largest = l;
  if (r < n && arr[r] > arr[largest]) largest = r;
  if (largest !== root) {
    [arr[root], arr[largest]] = [arr[largest], arr[root]];
    heapify(arr, n, largest);
  }
  return arr;
}`,
  },
  {
    id: "js-t-3",
    title: "Running Median Two Heaps",
    language: "JavaScript",
    length: "long",
    topic: "heap",
    tags: ["data-structures"],
    difficulty: "hard",
    code: `class RunningMedian {
  constructor() {
    this.low = [];
    this.high = [];
  }

  add(value) {
    this.low.push(value);
    this.low.sort((a, b) => b - a);
    this.high.push(this.low.shift());
    this.high.sort((a, b) => a - b);
    if (this.high.length > this.low.length) {
      this.low.push(this.high.shift());
      this.low.sort((a, b) => b - a);
    }
  }

  median() {
    if (this.low.length === this.high.length) {
      return (this.low[0] + this.high[0]) / 2;
    }
    return this.low[0];
  }
}`,
  },
  {
    id: "js-t-4",
    title: "Singleton Config Class",
    language: "JavaScript",
    length: "long",
    topic: "oop",
    tags: ["patterns"],
    difficulty: "hard",
    code: `class Config {
  static #instance = null;

  constructor() {
    if (Config.#instance) return Config.#instance;
    this.values = new Map();
    Config.#instance = this;
  }

  set(key, value) {
    this.values.set(key, value);
    return this;
  }

  get(key, fallback = null) {
    return this.values.has(key) ? this.values.get(key) : fallback;
  }
}`,
  },
  {
    id: "js-t-5",
    title: "Operator Style Vector Class",
    language: "JavaScript",
    length: "long",
    topic: "oop",
    tags: ["patterns"],
    difficulty: "hard",
    code: `class Vec2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  add(other) {
    return new Vec2(this.x + other.x, this.y + other.y);
  }

  scale(k) {
    return new Vec2(this.x * k, this.y * k);
  }

  get length() {
    return Math.hypot(this.x, this.y);
  }

  toString() {
    return "Vec2(" + this.x + ", " + this.y + ")";
  }
}`,
  },
  {
    id: "js-t-6",
    title: "Ackermann Function",
    language: "JavaScript",
    length: "short",
    topic: "recursion",
    tags: ["backtracking"],
    difficulty: "easy",
    code: `function ackermann(m, n) {
  if (m === 0) return n + 1;
  if (n === 0) return ackermann(m - 1, 1);
  return ackermann(m - 1, ackermann(m, n - 1));
}`,
  },
  {
    id: "js-t-7",
    title: "Subset Sum Backtracking",
    language: "JavaScript",
    length: "medium",
    topic: "recursion",
    tags: ["backtracking"],
    difficulty: "medium",
    code: `function subsetSum(nums, target, index = 0) {
  if (target === 0) return true;
  if (index >= nums.length || target < 0) return false;
  if (subsetSum(nums, target - nums[index], index + 1)) return true;
  return subsetSum(nums, target, index + 1);
}`,
  },
  {
    id: "js-t-8",
    title: "Generate Parentheses Backtracking",
    language: "JavaScript",
    length: "medium",
    topic: "recursion",
    tags: ["backtracking"],
    difficulty: "medium",
    code: `function generateParentheses(pairs) {
  const out = [];

  function build(current, openLeft, closeLeft) {
    if (openLeft === 0 && closeLeft === 0) {
      out.push(current);
      return;
    }
    if (openLeft > 0) build(current + "(", openLeft - 1, closeLeft + 1);
    if (closeLeft > 0) build(current + ")", openLeft, closeLeft - 1);
  }

  build("", pairs, 0);
  return out;
}`,
  },
  {
    id: "js-t-9",
    title: "Exponential Search",
    language: "JavaScript",
    length: "long",
    topic: "searching",
    tags: ["arrays"],
    difficulty: "hard",
    code: `function exponentialSearch(items, target) {
  if (items.length === 0) return -1;
  if (items[0] === target) return 0;

  let bound = 1;
  while (bound < items.length && items[bound] < target) bound *= 2;

  let lo = bound >> 1;
  let hi = Math.min(bound, items.length - 1);
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (items[mid] === target) return mid;
    if (items[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}`,
  },
  {
    id: "js-t-10",
    title: "Jump Search",
    language: "JavaScript",
    length: "medium",
    topic: "searching",
    tags: ["arrays"],
    difficulty: "medium",
    code: `function jumpSearch(items, target) {
  const n = items.length;
  const step = Math.floor(Math.sqrt(n)) || 1;
  let prev = 0;
  let bound = step;
  while (prev < n && items[Math.min(bound, n) - 1] < target) {
    prev = bound;
    bound += step;
    if (prev >= n) return -1;
  }
  for (let i = prev; i < Math.min(bound, n); i++) {
    if (items[i] === target) return i;
  }
  return -1;
}`,
  },
  {
    id: "js-t-11",
    title: "Binary Search Insert Position",
    language: "JavaScript",
    length: "medium",
    topic: "searching",
    tags: ["arrays"],
    difficulty: "medium",
    code: `function insertPosition(items, value) {
  let lo = 0;
  let hi = items.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (items[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}`,
  },
  {
    id: "js-t-12",
    title: "Single Number XOR",
    language: "JavaScript",
    length: "short",
    topic: "bits",
    tags: ["binary"],
    difficulty: "easy",
    code: `function singleNumber(nums) {
  return nums.reduce((acc, n) => acc ^ n, 0);
}`,
  },
  {
    id: "js-t-13",
    title: "Count Set Bits Table",
    language: "JavaScript",
    length: "medium",
    topic: "bits",
    tags: ["binary"],
    difficulty: "medium",
    code: `function bitCounts(limit) {
  const out = new Array(limit + 1).fill(0);
  for (let i = 1; i <= limit; i++) {
    out[i] = out[i >> 1] + (i & 1);
  }
  return out;
}`,
  },
  {
    id: "js-t-14",
    title: "House Robber DP",
    language: "JavaScript",
    length: "medium",
    topic: "dp",
    tags: ["optimisation"],
    difficulty: "hard",
    code: `function rob(houses) {
  let prev = 0;
  let curr = 0;
  for (const money of houses) {
    const take = prev + money;
    prev = curr;
    curr = Math.max(curr, take);
  }
  return curr;
}`,
  },
  {
    id: "js-t-15",
    title: "Unique Paths Grid DP",
    language: "JavaScript",
    length: "medium",
    topic: "dp",
    tags: ["optimisation"],
    difficulty: "hard",
    code: `function uniquePaths(rows, cols) {
  const row = new Array(cols).fill(1);
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      row[j] += row[j - 1];
    }
  }
  return row[cols - 1];
}`,
  },
  {
    id: "js-t-16",
    title: "Invert Binary Tree",
    language: "JavaScript",
    length: "medium",
    topic: "trees",
    tags: ["recursion"],
    difficulty: "hard",
    code: `function invert(node) {
  if (node === null) return null;
  [node.left, node.right] = [node.right, node.left];
  invert(node.left);
  invert(node.right);
  return node;
}`,
  },
  {
    id: "js-t-17",
    title: "Tree Diameter Recursion",
    language: "JavaScript",
    length: "medium",
    topic: "trees",
    tags: ["recursion"],
    difficulty: "hard",
    code: `function treeDiameter(root) {
  let best = 0;

  function depth(node) {
    if (node === null) return 0;
    const left = depth(node.left);
    const right = depth(node.right);
    best = Math.max(best, left + right);
    return 1 + Math.max(left, right);
  }

  depth(root);
  return best;
}`,
  },
  {
    id: "js-t-18",
    title: "Linked List Insert Sorted",
    language: "JavaScript",
    length: "medium",
    topic: "linked-list",
    tags: ["pointers"],
    difficulty: "medium",
    code: `function insertSorted(head, value) {
  const node = { value, next: null };
  if (head === null || value <= head.value) {
    node.next = head;
    return node;
  }

  let current = head;
  while (current.next !== null && current.next.value < value) {
    current = current.next;
  }
  node.next = current.next;
  current.next = node;
  return head;
}`,
  },
  {
    id: "js-t-19",
    title: "Linked List Remove Duplicates",
    language: "JavaScript",
    length: "medium",
    topic: "linked-list",
    tags: ["pointers"],
    difficulty: "medium",
    code: `function removeDuplicates(head) {
  const seen = new Set();
  let current = head;
  let previous = null;
  while (current !== null) {
    if (seen.has(current.value)) {
      previous.next = current.next;
    } else {
      seen.add(current.value);
      previous = current;
    }
    current = current.next;
  }
  return head;
}`,
  },
  {
    id: "js-t-20",
    title: "Linked List Middle Node",
    language: "JavaScript",
    length: "medium",
    topic: "linked-list",
    tags: ["pointers"],
    difficulty: "medium",
    code: `function middleNode(head) {
  let slow = head;
  let fast = head;
  while (fast !== null && fast.next !== null) {
    slow = slow.next;
    fast = fast.next.next;
  }
  return slow;
}`,
  },
  {
    id: "js-t-21",
    title: "Group Anagrams Hash Map",
    language: "JavaScript",
    length: "medium",
    topic: "hashing",
    tags: ["counting"],
    difficulty: "medium",
    code: `function groupAnagrams(words) {
  const buckets = new Map();
  for (const word of words) {
    const key = word.split("").sort().join("");
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(word);
  }
  return [...buckets.values()];
}`,
  },
  {
    id: "js-t-22",
    title: "Longest Consecutive Sequence Hash",
    language: "JavaScript",
    length: "medium",
    topic: "hashing",
    tags: ["counting"],
    difficulty: "medium",
    code: `function longestConsecutive(nums) {
  const pool = new Set(nums);
  let best = 0;
  for (const value of pool) {
    if (pool.has(value - 1)) continue;
    let run = 1;
    let current = value;
    while (pool.has(current + 1)) {
      current++;
      run++;
    }
    best = Math.max(best, run);
  }
  return best;
}`,
  },
  {
    id: "js-t-23",
    title: "Matrix Identity Builder",
    language: "JavaScript",
    length: "short",
    topic: "matrix",
    tags: ["arrays"],
    difficulty: "easy",
    code: `function identity(n) {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );
}`,
  },
  {
    id: "js-t-24",
    title: "Matrix Boundary Sum",
    language: "JavaScript",
    length: "medium",
    topic: "matrix",
    tags: ["arrays"],
    difficulty: "medium",
    code: `function boundarySum(matrix) {
  const rows = matrix.length;
  if (rows === 0) return 0;
  const cols = matrix[0].length;
  let total = 0;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (i === 0 || j === 0 || i === rows - 1 || j === cols - 1) {
        total += matrix[i][j];
      }
    }
  }
  return total;
}`,
  },
  {
    id: "js-t-25",
    title: "Graph Has Path DFS",
    language: "JavaScript",
    length: "medium",
    topic: "graphs",
    tags: ["traversal"],
    difficulty: "hard",
    code: `function hasPath(graph, start, goal, seen = new Set()) {
  if (start === goal) return true;
  seen.add(start);
  for (const next of graph[start] || []) {
    if (!seen.has(next) && hasPath(graph, next, goal, seen)) return true;
  }
  return false;
}`,
  },
  {
    id: "js-t-26",
    title: "Graph Shortest Unweighted Path",
    language: "JavaScript",
    length: "long",
    topic: "graphs",
    tags: ["traversal"],
    difficulty: "hard",
    code: `function shortestPath(graph, start, goal) {
  const previous = new Map([[start, null]]);
  const queue = [start];
  let head = 0;

  while (head < queue.length) {
    const node = queue[head++];
    if (node === goal) break;
    for (const next of graph[node] || []) {
      if (previous.has(next)) continue;
      previous.set(next, node);
      queue.push(next);
    }
  }

  if (!previous.has(goal)) return [];
  const path = [];
  for (let at = goal; at !== null; at = previous.get(at)) path.push(at);
  return path.reverse();
}`,
  },
  {
    id: "js-t-27",
    title: "Circular Queue Class",
    language: "JavaScript",
    length: "long",
    topic: "stack-queue",
    tags: ["data-structures"],
    difficulty: "hard",
    code: `class CircularQueue {
  constructor(capacity) {
    this.buf = new Array(capacity);
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }

  enqueue(value) {
    if (this.count === this.buf.length) return false;
    this.buf[this.tail] = value;
    this.tail = (this.tail + 1) % this.buf.length;
    this.count++;
    return true;
  }

  dequeue() {
    if (this.count === 0) return undefined;
    const value = this.buf[this.head];
    this.head = (this.head + 1) % this.buf.length;
    this.count--;
    return value;
  }
}`,
  },
  {
    id: "js-t-28",
    title: "Bracket Depth Stack",
    language: "JavaScript",
    length: "medium",
    topic: "stack-queue",
    tags: ["data-structures"],
    difficulty: "medium",
    code: `function maxDepth(text) {
  let depth = 0;
  let best = 0;
  for (const ch of text) {
    if (ch === "(") {
      depth++;
      best = Math.max(best, depth);
    } else if (ch === ")") {
      depth--;
    }
  }
  return best;
}`,
  },
  {
    id: "js-t-29",
    title: "String Compression Run Length",
    language: "JavaScript",
    length: "long",
    topic: "strings",
    tags: ["text"],
    difficulty: "hard",
    code: `function compress(text) {
  if (text.length === 0) return "";
  const parts = [];
  let current = text[0];
  let run = 1;

  for (let i = 1; i < text.length; i++) {
    if (text[i] === current) {
      run++;
    } else {
      parts.push(current + run);
      current = text[i];
      run = 1;
    }
  }
  parts.push(current + run);

  const out = parts.join("");
  return out.length < text.length ? out : text;
}`,
  },
  {
    id: "js-t-30",
    title: "Caesar Cipher Shift",
    language: "JavaScript",
    length: "long",
    topic: "strings",
    tags: ["text"],
    difficulty: "hard",
    code: `function caesar(text, shift) {
  const A = "A".charCodeAt(0);
  const a = "a".charCodeAt(0);
  let out = "";

  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code >= A && code < A + 26) {
      out += String.fromCharCode(((code - A + shift) % 26) + A);
    } else if (code >= a && code < a + 26) {
      out += String.fromCharCode(((code - a + shift) % 26) + a);
    } else {
      out += ch;
    }
  }
  return out;
}`,
  },
];

export default topicFillSnippets;
