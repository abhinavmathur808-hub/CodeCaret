/* ═══════════════════════════════════════════════════════════════
   extraSnippets.js — second wave of the typing dataset
   ─────────────────────────────────────────────────────────────
   120 snippets (40 C++, 40 Python, 40 JavaScript) chosen to fill
   the topics the first 300 barely covered: heaps, matrices,
   searching, async, OOP and bit work all had fewer than a dozen
   entries between them, so a topic filter over the old corpus
   would have had almost nothing to show.

   topic / tags / difficulty are stamped by scripts/labelSnippets.cjs
   rather than written by hand, so the labels here agree with the
   labels on the original 300.

   AUTHORING RULES — snippets live inside template literals, so the
   code must never contain a backtick, a "${" or a backslash. A
   backslash is silently eaten (an untagged template turns "\d" into
   "d"), which would quietly corrupt a regex into something that
   still parses but no longer matches.
   ═══════════════════════════════════════════════════════════════ */

const extraSnippets = [
  /* ═══════════════════════════════════════════════════════════
     C++
     ═══════════════════════════════════════════════════════════ */

  {
    id: "cpp-x-1",
    title: "Is Vowel Character",
    language: "C++",
    length: "short",
    topic: "strings",
    tags: ["text"],
    difficulty: "easy",
    code: `bool isVowel(char c) {
  c = tolower(c);
  return c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u';
}`,
  },
  {
    id: "cpp-x-2",
    title: "Count Trailing Zero Bits",
    language: "C++",
    length: "short",
    topic: "bits",
    tags: ["binary"],
    difficulty: "easy",
    code: `int trailingZeros(unsigned n) {
  if (n == 0) return 32;
  return __builtin_ctz(n);
}`,
  },
  {
    id: "cpp-x-3",
    title: "Ceil Division",
    language: "C++",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `int ceilDiv(int a, int b) {
  return (a + b - 1) / b;
}`,
  },
  {
    id: "cpp-x-4",
    title: "Is Perfect Square",
    language: "C++",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `bool isPerfectSquare(long long n) {
  long long r = sqrt((double)n);
  return r * r == n || (r + 1) * (r + 1) == n;
}`,
  },
  {
    id: "cpp-x-5",
    title: "Is Sorted Array",
    language: "C++",
    length: "short",
    topic: "arrays",
    tags: ["indexing"],
    difficulty: "easy",
    code: `bool isSorted(vector<int>& a) {
  for (int i = 1; i < a.size(); i++)
    if (a[i] < a[i - 1]) return false;
  return true;
}`,
  },
  {
    id: "cpp-x-6",
    title: "Lower Bound Search",
    language: "C++",
    length: "short",
    topic: "searching",
    tags: ["arrays"],
    difficulty: "easy",
    code: `int lowerBound(vector<int>& a, int key) {
  return lower_bound(a.begin(), a.end(), key) - a.begin();
}`,
  },
  {
    id: "cpp-x-7",
    title: "Toggle Nth Bit",
    language: "C++",
    length: "short",
    topic: "bits",
    tags: ["binary"],
    difficulty: "easy",
    code: `int toggleBit(int n, int pos) {
  return n ^ (1 << pos);
}`,
  },
  {
    id: "cpp-x-8",
    title: "Round to Nearest Multiple",
    language: "C++",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `int roundTo(int value, int step) {
  return ((value + step / 2) / step) * step;
}`,
  },
  {
    id: "cpp-x-9",
    title: "Peek Stack Top",
    language: "C++",
    length: "short",
    topic: "stack-queue",
    tags: ["data-structures"],
    difficulty: "easy",
    code: `int peek(stack<int>& s) {
  if (s.empty()) return -1;
  return s.top();
}`,
  },
  {
    id: "cpp-x-10",
    title: "Isolate Lowest Set Bit",
    language: "C++",
    length: "short",
    topic: "bits",
    tags: ["binary"],
    difficulty: "easy",
    code: `int lowestSetBit(int n) {
  return n & (-n);
}`,
  },
  {
    id: "cpp-x-11",
    title: "Binary Search on Answer",
    language: "C++",
    length: "medium",
    topic: "searching",
    tags: ["arrays"],
    difficulty: "medium",
    code: `int minCapacity(vector<int>& w, int days) {
  int lo = *max_element(w.begin(), w.end());
  int hi = accumulate(w.begin(), w.end(), 0);
  while (lo < hi) {
    int mid = lo + (hi - lo) / 2;
    int need = 1, load = 0;
    for (int x : w) {
      if (load + x > mid) { need++; load = 0; }
      load += x;
    }
    if (need > days) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}`,
  },
  {
    id: "cpp-x-12",
    title: "Matrix Multiplication",
    language: "C++",
    length: "medium",
    topic: "matrix",
    tags: ["arrays"],
    difficulty: "medium",
    code: `vector<vector<int>> multiply(vector<vector<int>>& a,
                             vector<vector<int>>& b) {
  int n = a.size(), m = b[0].size(), k = b.size();
  vector<vector<int>> c(n, vector<int>(m, 0));
  for (int i = 0; i < n; i++)
    for (int j = 0; j < m; j++)
      for (int t = 0; t < k; t++)
        c[i][j] += a[i][t] * b[t][j];
  return c;
}`,
  },
  {
    id: "cpp-x-13",
    title: "Rotate Matrix 90 Degrees",
    language: "C++",
    length: "medium",
    topic: "matrix",
    tags: ["arrays"],
    difficulty: "medium",
    code: `void rotate90(vector<vector<int>>& m) {
  int n = m.size();
  for (int i = 0; i < n; i++)
    for (int j = i + 1; j < n; j++)
      swap(m[i][j], m[j][i]);
  for (int i = 0; i < n; i++)
    reverse(m[i].begin(), m[i].end());
}`,
  },
  {
    id: "cpp-x-14",
    title: "Max Heap Sift Up",
    language: "C++",
    length: "medium",
    topic: "heap",
    tags: ["data-structures"],
    difficulty: "hard",
    code: `void siftUp(vector<int>& heap, int i) {
  while (i > 0) {
    int parent = (i - 1) / 2;
    if (heap[parent] >= heap[i]) break;
    swap(heap[parent], heap[i]);
    i = parent;
  }
}`,
  },
  {
    id: "cpp-x-15",
    title: "Priority Queue Top K",
    language: "C++",
    length: "medium",
    topic: "heap",
    tags: ["data-structures"],
    difficulty: "hard",
    code: `vector<int> topK(vector<int>& nums, int k) {
  priority_queue<int, vector<int>, greater<int>> pq;
  for (int x : nums) {
    pq.push(x);
    if (pq.size() > k) pq.pop();
  }
  vector<int> out;
  while (!pq.empty()) { out.push_back(pq.top()); pq.pop(); }
  return out;
}`,
  },
  {
    id: "cpp-x-16",
    title: "Min Stack With Tracking",
    language: "C++",
    length: "medium",
    topic: "stack-queue",
    tags: ["data-structures"],
    difficulty: "medium",
    code: `class MinStack {
  stack<int> data, mins;
public:
  void push(int x) {
    data.push(x);
    if (mins.empty() || x <= mins.top()) mins.push(x);
  }
  void pop() {
    if (data.top() == mins.top()) mins.pop();
    data.pop();
  }
  int getMin() { return mins.top(); }
};`,
  },
  {
    id: "cpp-x-17",
    title: "Remove Nth From End of Linked List",
    language: "C++",
    length: "medium",
    topic: "linked-list",
    tags: ["pointers"],
    difficulty: "medium",
    code: `ListNode* removeNth(ListNode* head, int n) {
  ListNode dummy(0);
  dummy.next = head;
  ListNode* fast = &dummy;
  ListNode* slow = &dummy;
  for (int i = 0; i <= n; i++) fast = fast->next;
  while (fast) { fast = fast->next; slow = slow->next; }
  slow->next = slow->next->next;
  return dummy.next;
}`,
  },
  {
    id: "cpp-x-18",
    title: "Palindrome Linked List",
    language: "C++",
    length: "medium",
    topic: "linked-list",
    tags: ["pointers"],
    difficulty: "medium",
    code: `bool isPalindrome(ListNode* head) {
  vector<int> vals;
  for (ListNode* p = head; p; p = p->next)
    vals.push_back(p->val);
  int i = 0, j = vals.size() - 1;
  while (i < j) {
    if (vals[i] != vals[j]) return false;
    i++; j--;
  }
  return true;
}`,
  },
  {
    id: "cpp-x-19",
    title: "Count Character Frequency",
    language: "C++",
    length: "short",
    topic: "hashing",
    tags: ["counting"],
    difficulty: "easy",
    code: `unordered_map<char, int> frequency(string s) {
  unordered_map<char, int> counts;
  for (char c : s) counts[c]++;
  return counts;
}`,
  },
  {
    id: "cpp-x-20",
    title: "Longest Word In String",
    language: "C++",
    length: "medium",
    topic: "strings",
    tags: ["text"],
    difficulty: "medium",
    code: `string longestWord(string text) {
  string best = "", current = "";
  for (char c : text) {
    if (c == ' ') {
      if (current.size() > best.size()) best = current;
      current = "";
    } else {
      current += c;
    }
  }
  return current.size() > best.size() ? current : best;
}`,
  },
  {
    id: "cpp-x-21",
    title: "Spiral Matrix Traversal",
    language: "C++",
    length: "long",
    topic: "matrix",
    tags: ["arrays"],
    difficulty: "hard",
    code: `vector<int> spiral(vector<vector<int>>& m) {
  vector<int> out;
  if (m.empty()) return out;
  int top = 0, bottom = m.size() - 1;
  int left = 0, right = m[0].size() - 1;
  while (top <= bottom && left <= right) {
    for (int j = left; j <= right; j++)
      out.push_back(m[top][j]);
    top++;
    for (int i = top; i <= bottom; i++)
      out.push_back(m[i][right]);
    right--;
    if (top <= bottom) {
      for (int j = right; j >= left; j--)
        out.push_back(m[bottom][j]);
      bottom--;
    }
    if (left <= right) {
      for (int i = bottom; i >= top; i--)
        out.push_back(m[i][left]);
      left++;
    }
  }
  return out;
}`,
  },
  {
    id: "cpp-x-22",
    title: "Binary Max Heap Class",
    language: "C++",
    length: "long",
    topic: "heap",
    tags: ["data-structures"],
    difficulty: "hard",
    code: `class MaxHeap {
  vector<int> h;
public:
  void push(int v) {
    h.push_back(v);
    int i = h.size() - 1;
    while (i > 0 && h[(i - 1) / 2] < h[i]) {
      swap(h[(i - 1) / 2], h[i]);
      i = (i - 1) / 2;
    }
  }
  int pop() {
    int top = h[0];
    h[0] = h.back();
    h.pop_back();
    int i = 0, n = h.size();
    while (true) {
      int big = i, l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && h[l] > h[big]) big = l;
      if (r < n && h[r] > h[big]) big = r;
      if (big == i) break;
      swap(h[i], h[big]);
      i = big;
    }
    return top;
  }
  bool empty() { return h.empty(); }
};`,
  },
  {
    id: "cpp-x-23",
    title: "Circular Buffer Class",
    language: "C++",
    length: "long",
    topic: "oop",
    tags: ["patterns"],
    difficulty: "hard",
    code: `class CircularBuffer {
  vector<int> buf;
  int head = 0, tail = 0, count = 0;
public:
  CircularBuffer(int capacity) : buf(capacity) {}

  bool push(int value) {
    if (count == (int)buf.size()) return false;
    buf[tail] = value;
    tail = (tail + 1) % buf.size();
    count++;
    return true;
  }

  bool pop(int& out) {
    if (count == 0) return false;
    out = buf[head];
    head = (head + 1) % buf.size();
    count--;
    return true;
  }

  int size() const { return count; }
};`,
  },
  {
    id: "cpp-x-24",
    title: "Bank Account Class",
    language: "C++",
    length: "long",
    topic: "oop",
    tags: ["patterns"],
    difficulty: "hard",
    code: `class BankAccount {
  string owner;
  long long balance;
public:
  BankAccount(string name, long long start)
      : owner(name), balance(start) {}

  void deposit(long long amount) {
    if (amount <= 0) return;
    balance += amount;
  }

  bool withdraw(long long amount) {
    if (amount <= 0 || amount > balance) return false;
    balance -= amount;
    return true;
  }

  long long getBalance() const { return balance; }
  string getOwner() const { return owner; }
};`,
  },
  {
    id: "cpp-x-25",
    title: "Shape Inheritance Hierarchy",
    language: "C++",
    length: "long",
    topic: "oop",
    tags: ["patterns"],
    difficulty: "hard",
    code: `class Shape {
public:
  virtual double area() const = 0;
  virtual string name() const = 0;
  virtual ~Shape() {}
};

class Circle : public Shape {
  double r;
public:
  Circle(double radius) : r(radius) {}
  double area() const override { return 3.14159265 * r * r; }
  string name() const override { return "Circle"; }
};

class Rectangle : public Shape {
  double w, h;
public:
  Rectangle(double width, double height) : w(width), h(height) {}
  double area() const override { return w * h; }
  string name() const override { return "Rectangle"; }
};`,
  },
  {
    id: "cpp-x-26",
    title: "Mutex Protected Counter",
    language: "C++",
    length: "long",
    topic: "async",
    tags: ["timing"],
    difficulty: "hard",
    code: `class SafeCounter {
  mutable mutex m;
  long long value = 0;
public:
  void increment() {
    lock_guard<mutex> guard(m);
    value++;
  }

  void add(long long delta) {
    lock_guard<mutex> guard(m);
    value += delta;
  }

  long long get() const {
    lock_guard<mutex> guard(m);
    return value;
  }
};`,
  },
  {
    id: "cpp-x-27",
    title: "Tower of Hanoi",
    language: "C++",
    length: "medium",
    topic: "recursion",
    tags: ["backtracking"],
    difficulty: "medium",
    code: `void hanoi(int n, char from, char to, char via) {
  if (n == 0) return;
  hanoi(n - 1, from, via, to);
  cout << "move " << n << " " << from << "->" << to << endl;
  hanoi(n - 1, via, to, from);
}`,
  },
  {
    id: "cpp-x-28",
    title: "Flood Fill Recursion",
    language: "C++",
    length: "medium",
    topic: "graphs",
    tags: ["grid", "recursion"],
    difficulty: "hard",
    code: `void floodFill(vector<vector<int>>& grid, int r, int c,
               int from, int to) {
  int rows = grid.size();
  if (rows == 0) return;
  int cols = grid[0].size();
  if (r < 0 || r >= rows || c < 0 || c >= cols) return;
  if (grid[r][c] != from || from == to) return;

  grid[r][c] = to;
  floodFill(grid, r + 1, c, from, to);
  floodFill(grid, r - 1, c, from, to);
  floodFill(grid, r, c + 1, from, to);
  floodFill(grid, r, c - 1, from, to);
}`,
  },
  {
    id: "cpp-x-29",
    title: "Longest Palindromic Substring",
    language: "C++",
    length: "long",
    topic: "trees",
    tags: ["recursion"],
    difficulty: "hard",
    code: `string longestPalindrome(string s) {
  if (s.empty()) return "";
  int start = 0, best = 1;
  for (int center = 0; center < s.size(); center++) {
    for (int span = 0; span < 2; span++) {
      int l = center, r = center + span;
      while (l >= 0 && r < (int)s.size() && s[l] == s[r]) {
        if (r - l + 1 > best) {
          best = r - l + 1;
          start = l;
        }
        l--;
        r++;
      }
    }
  }
  return s.substr(start, best);
}`,
  },
  {
    id: "cpp-x-30",
    title: "Word Frequency Sort",
    language: "C++",
    length: "medium",
    topic: "hashing",
    tags: ["counting"],
    difficulty: "medium",
    code: `vector<pair<string, int>> topWords(vector<string>& words, int k) {
  unordered_map<string, int> counts;
  for (const string& w : words) counts[w]++;

  vector<pair<string, int>> items(counts.begin(), counts.end());
  sort(items.begin(), items.end(),
       [](const pair<string, int>& a, const pair<string, int>& b) {
         if (a.second != b.second) return a.second > b.second;
         return a.first < b.first;
       });

  if ((int)items.size() > k) items.resize(k);
  return items;
}`,
  },
  {
    id: "cpp-x-31",
    title: "Set Matrix Zeroes",
    language: "C++",
    length: "long",
    topic: "matrix",
    tags: ["arrays"],
    difficulty: "hard",
    code: `void setZeroes(vector<vector<int>>& m) {
  int rows = m.size();
  if (rows == 0) return;
  int cols = m[0].size();
  set<int> zeroRows, zeroCols;

  for (int i = 0; i < rows; i++)
    for (int j = 0; j < cols; j++)
      if (m[i][j] == 0) {
        zeroRows.insert(i);
        zeroCols.insert(j);
      }

  for (int i = 0; i < rows; i++)
    for (int j = 0; j < cols; j++)
      if (zeroRows.count(i) || zeroCols.count(j))
        m[i][j] = 0;
}`,
  },
  {
    id: "cpp-x-32",
    title: "Search in Rotated Array",
    language: "C++",
    length: "medium",
    topic: "searching",
    tags: ["arrays"],
    difficulty: "medium",
    code: `int searchRotated(vector<int>& a, int target) {
  int lo = 0, hi = a.size() - 1;
  while (lo <= hi) {
    int mid = lo + (hi - lo) / 2;
    if (a[mid] == target) return mid;
    if (a[lo] <= a[mid]) {
      if (a[lo] <= target && target < a[mid]) hi = mid - 1;
      else lo = mid + 1;
    } else {
      if (a[mid] < target && target <= a[hi]) lo = mid + 1;
      else hi = mid - 1;
    }
  }
  return -1;
}`,
  },
  {
    id: "cpp-x-33",
    title: "Deque Sliding Window Maximum",
    language: "C++",
    length: "medium",
    topic: "arrays",
    tags: ["indexing"],
    difficulty: "medium",
    code: `vector<int> windowMax(vector<int>& nums, int k) {
  deque<int> idx;
  vector<int> out;
  for (int i = 0; i < (int)nums.size(); i++) {
    while (!idx.empty() && idx.front() <= i - k)
      idx.pop_front();
    while (!idx.empty() && nums[idx.back()] <= nums[i])
      idx.pop_back();
    idx.push_back(i);
    if (i >= k - 1) out.push_back(nums[idx.front()]);
  }
  return out;
}`,
  },
  {
    id: "cpp-x-34",
    title: "Count Islands Grid Search",
    language: "C++",
    length: "long",
    topic: "graphs",
    tags: ["grid", "recursion"],
    difficulty: "hard",
    code: `void sink(vector<vector<char>>& g, int r, int c) {
  if (r < 0 || r >= (int)g.size()) return;
  if (c < 0 || c >= (int)g[0].size()) return;
  if (g[r][c] != '1') return;
  g[r][c] = '0';
  sink(g, r + 1, c);
  sink(g, r - 1, c);
  sink(g, r, c + 1);
  sink(g, r, c - 1);
}

int countIslands(vector<vector<char>>& g) {
  int total = 0;
  for (int r = 0; r < (int)g.size(); r++)
    for (int c = 0; c < (int)g[0].size(); c++)
      if (g[r][c] == '1') {
        total++;
        sink(g, r, c);
      }
  return total;
}`,
  },
  {
    id: "cpp-x-35",
    title: "Reverse Words In Sentence",
    language: "C++",
    length: "long",
    topic: "strings",
    tags: ["text"],
    difficulty: "hard",
    code: `string reverseWords(string s) {
  vector<string> words;
  string current = "";
  for (char c : s) {
    if (c == ' ') {
      if (!current.empty()) words.push_back(current);
      current = "";
    } else current += c;
  }
  if (!current.empty()) words.push_back(current);

  string out = "";
  for (int i = words.size() - 1; i >= 0; i--) {
    out += words[i];
    if (i > 0) out += " ";
  }
  return out;
}`,
  },
  {
    id: "cpp-x-36",
    title: "Gray Code Sequence",
    language: "C++",
    length: "medium",
    topic: "bits",
    tags: ["binary"],
    difficulty: "medium",
    code: `vector<int> grayCode(int bits) {
  vector<int> out;
  int total = 1 << bits;
  for (int i = 0; i < total; i++)
    out.push_back(i ^ (i >> 1));
  return out;
}`,
  },
  {
    id: "cpp-x-37",
    title: "Queue Using Two Stacks",
    language: "C++",
    length: "long",
    topic: "stack-queue",
    tags: ["data-structures"],
    difficulty: "hard",
    code: `class QueueFromStacks {
  stack<int> in, out;

  void shift() {
    if (out.empty())
      while (!in.empty()) {
        out.push(in.top());
        in.pop();
      }
  }

public:
  void push(int x) { in.push(x); }

  int pop() {
    shift();
    int v = out.top();
    out.pop();
    return v;
  }

  int front() {
    shift();
    return out.top();
  }

  bool empty() { return in.empty() && out.empty(); }
};`,
  },
  {
    id: "cpp-x-38",
    title: "Diagonal Matrix Sum",
    language: "C++",
    length: "medium",
    topic: "matrix",
    tags: ["arrays"],
    difficulty: "medium",
    code: `int diagonalSum(vector<vector<int>>& m) {
  int n = m.size(), total = 0;
  for (int i = 0; i < n; i++) {
    total += m[i][i];
    if (i != n - 1 - i) total += m[i][n - 1 - i];
  }
  return total;
}`,
  },
  {
    id: "cpp-x-39",
    title: "Binary Search First Occurrence",
    language: "C++",
    length: "medium",
    topic: "searching",
    tags: ["arrays"],
    difficulty: "medium",
    code: `int firstOccurrence(vector<int>& a, int target) {
  int lo = 0, hi = a.size() - 1, found = -1;
  while (lo <= hi) {
    int mid = lo + (hi - lo) / 2;
    if (a[mid] == target) {
      found = mid;
      hi = mid - 1;
    } else if (a[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return found;
}`,
  },
  {
    id: "cpp-x-40",
    title: "Stack Based Expression Evaluation",
    language: "C++",
    length: "long",
    topic: "stack-queue",
    tags: ["data-structures"],
    difficulty: "hard",
    code: `int evalRPN(vector<string>& tokens) {
  stack<int> s;
  for (const string& t : tokens) {
    if (t == "+" || t == "-" || t == "*" || t == "/") {
      int b = s.top(); s.pop();
      int a = s.top(); s.pop();
      if (t == "+") s.push(a + b);
      else if (t == "-") s.push(a - b);
      else if (t == "*") s.push(a * b);
      else s.push(a / b);
    } else {
      s.push(stoi(t));
    }
  }
  return s.top();
}`,
  },
  /* C++ functional idioms — the one topic/language cell the corpus
     had nothing in, which meant "C++ + Functional" silently fell back
     to an unrelated C++ snippet. */
  {
    id: "cpp-x-41",
    title: "Transform Map Function",
    language: "C++",
    length: "medium",
    topic: "functional",
    tags: ["idioms"],
    difficulty: "medium",
    code: `vector<int> mapDouble(const vector<int>& src) {
  vector<int> out(src.size());
  transform(src.begin(), src.end(), out.begin(),
            [](int x) { return x * 2; });
  return out;
}`,
  },
  {
    id: "cpp-x-42",
    title: "Accumulate Reduce Sum",
    language: "C++",
    length: "short",
    topic: "functional",
    tags: ["idioms"],
    difficulty: "easy",
    code: `long long reduceSum(const vector<int>& nums) {
  return accumulate(nums.begin(), nums.end(), 0LL,
                    [](long long acc, int x) { return acc + x; });
}`,
  },
  {
    id: "cpp-x-43",
    title: "Filter Even Numbers",
    language: "C++",
    length: "medium",
    topic: "functional",
    tags: ["idioms"],
    difficulty: "medium",
    code: `vector<int> filterEven(const vector<int>& src) {
  vector<int> out;
  copy_if(src.begin(), src.end(), back_inserter(out),
          [](int x) { return x % 2 == 0; });
  return out;
}`,
  },
  {
    id: "cpp-x-44",
    title: "Compose Functions",
    language: "C++",
    length: "medium",
    topic: "functional",
    tags: ["idioms"],
    difficulty: "medium",
    code: `using Fn = function<int(int)>;

Fn compose(const Fn& f, const Fn& g) {
  return [f, g](int x) { return f(g(x)); };
}

Fn composeAll(const vector<Fn>& fns) {
  Fn out = [](int x) { return x; };
  for (auto it = fns.rbegin(); it != fns.rend(); ++it) {
    out = compose(out, *it);
  }
  return out;
}`,
  },

  /* ═══════════════════════════════════════════════════════════
     Python
     ═══════════════════════════════════════════════════════════ */

  {
    id: "py-x-1",
    title: "Is Vowel Character",
    language: "Python",
    length: "short",
    topic: "strings",
    tags: ["text"],
    difficulty: "easy",
    code: `def is_vowel(ch):
    return ch.lower() in "aeiou"`,
  },
  {
    id: "py-x-2",
    title: "Ceil Division",
    language: "Python",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `def ceil_div(a, b):
    return -(-a // b)`,
  },
  {
    id: "py-x-3",
    title: "Is Perfect Square",
    language: "Python",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `def is_perfect_square(n):
    root = int(n ** 0.5)
    return root * root == n`,
  },
  {
    id: "py-x-4",
    title: "Is Sorted List",
    language: "Python",
    length: "short",
    topic: "arrays",
    tags: ["indexing"],
    difficulty: "easy",
    code: `def is_sorted(items):
    return all(items[i] <= items[i + 1]
               for i in range(len(items) - 1))`,
  },
  {
    id: "py-x-5",
    title: "Toggle Nth Bit",
    language: "Python",
    length: "short",
    topic: "bits",
    tags: ["binary"],
    difficulty: "easy",
    code: `def toggle_bit(n, pos):
    return n ^ (1 << pos)`,
  },
  {
    id: "py-x-6",
    title: "Isolate Lowest Set Bit",
    language: "Python",
    length: "short",
    topic: "bits",
    tags: ["binary"],
    difficulty: "easy",
    code: `def lowest_set_bit(n):
    return n & -n`,
  },
  {
    id: "py-x-7",
    title: "Round to Nearest Multiple",
    language: "Python",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `def round_to(value, step):
    return ((value + step // 2) // step) * step`,
  },
  {
    id: "py-x-8",
    title: "Chunk a List",
    language: "Python",
    length: "short",
    topic: "arrays",
    tags: ["indexing"],
    difficulty: "easy",
    code: `def chunk(items, size):
    return [items[i:i + size]
            for i in range(0, len(items), size)]`,
  },
  {
    id: "py-x-9",
    title: "Transpose With Zip",
    language: "Python",
    length: "short",
    topic: "matrix",
    tags: ["arrays"],
    difficulty: "easy",
    code: `def transpose(matrix):
    return [list(row) for row in zip(*matrix)]`,
  },
  {
    id: "py-x-10",
    title: "Count Character Frequency",
    language: "Python",
    length: "short",
    topic: "hashing",
    tags: ["counting"],
    difficulty: "easy",
    code: `def frequency(text):
    counts = {}
    for ch in text:
        counts[ch] = counts.get(ch, 0) + 1
    return counts`,
  },
  {
    id: "py-x-11",
    title: "Binary Search First Occurrence",
    language: "Python",
    length: "medium",
    topic: "searching",
    tags: ["arrays"],
    difficulty: "medium",
    code: `def first_occurrence(items, target):
    lo, hi, found = 0, len(items) - 1, -1
    while lo <= hi:
        mid = (lo + hi) // 2
        if items[mid] == target:
            found = mid
            hi = mid - 1
        elif items[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return found`,
  },
  {
    id: "py-x-12",
    title: "Search in Rotated List",
    language: "Python",
    length: "long",
    topic: "searching",
    tags: ["arrays"],
    difficulty: "hard",
    code: `def search_rotated(items, target):
    lo, hi = 0, len(items) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if items[mid] == target:
            return mid
        if items[lo] <= items[mid]:
            if items[lo] <= target < items[mid]:
                hi = mid - 1
            else:
                lo = mid + 1
        else:
            if items[mid] < target <= items[hi]:
                lo = mid + 1
            else:
                hi = mid - 1
    return -1`,
  },
  {
    id: "py-x-13",
    title: "Matrix Multiplication",
    language: "Python",
    length: "medium",
    topic: "matrix",
    tags: ["arrays"],
    difficulty: "medium",
    code: `def multiply(a, b):
    rows, inner, cols = len(a), len(b), len(b[0])
    out = [[0] * cols for _ in range(rows)]
    for i in range(rows):
        for j in range(cols):
            for k in range(inner):
                out[i][j] += a[i][k] * b[k][j]
    return out`,
  },
  {
    id: "py-x-14",
    title: "Rotate Matrix 90 Degrees",
    language: "Python",
    length: "medium",
    topic: "matrix",
    tags: ["arrays"],
    difficulty: "medium",
    code: `def rotate90(matrix):
    n = len(matrix)
    for i in range(n):
        for j in range(i + 1, n):
            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
    for row in matrix:
        row.reverse()
    return matrix`,
  },
  {
    id: "py-x-15",
    title: "Diagonal Matrix Sum",
    language: "Python",
    length: "medium",
    topic: "matrix",
    tags: ["arrays"],
    difficulty: "medium",
    code: `def diagonal_sum(matrix):
    n = len(matrix)
    total = 0
    for i in range(n):
        total += matrix[i][i]
        if i != n - 1 - i:
            total += matrix[i][n - 1 - i]
    return total`,
  },
  {
    id: "py-x-16",
    title: "Heapq Top K Elements",
    language: "Python",
    length: "medium",
    topic: "heap",
    tags: ["data-structures"],
    difficulty: "hard",
    code: `import heapq


def top_k(nums, k):
    heap = []
    for value in nums:
        heapq.heappush(heap, value)
        if len(heap) > k:
            heapq.heappop(heap)
    return sorted(heap, reverse=True)`,
  },
  {
    id: "py-x-17",
    title: "Min Heap Sift Up",
    language: "Python",
    length: "medium",
    topic: "heap",
    tags: ["data-structures"],
    difficulty: "hard",
    code: `def sift_up(heap, index):
    while index > 0:
        parent = (index - 1) // 2
        if heap[parent] <= heap[index]:
            break
        heap[parent], heap[index] = heap[index], heap[parent]
        index = parent
    return heap`,
  },
  {
    id: "py-x-18",
    title: "Merge K Sorted Lists With Heap",
    language: "Python",
    length: "medium",
    topic: "arrays",
    tags: ["indexing"],
    difficulty: "medium",
    code: `import heapq


def merge_k(lists):
    heap = []
    for i, seq in enumerate(lists):
        if seq:
            heapq.heappush(heap, (seq[0], i, 0))
    out = []
    while heap:
        value, li, idx = heapq.heappop(heap)
        out.append(value)
        if idx + 1 < len(lists[li]):
            heapq.heappush(heap, (lists[li][idx + 1], li, idx + 1))
    return out`,
  },
  {
    id: "py-x-19",
    title: "Min Stack With Tracking",
    language: "Python",
    length: "long",
    topic: "stack-queue",
    tags: ["data-structures"],
    difficulty: "hard",
    code: `class MinStack:
    def __init__(self):
        self.data = []
        self.mins = []

    def push(self, value):
        self.data.append(value)
        if not self.mins or value <= self.mins[-1]:
            self.mins.append(value)

    def pop(self):
        value = self.data.pop()
        if value == self.mins[-1]:
            self.mins.pop()
        return value

    def get_min(self):
        return self.mins[-1]`,
  },
  {
    id: "py-x-20",
    title: "Circular Queue Class",
    language: "Python",
    length: "long",
    topic: "stack-queue",
    tags: ["data-structures"],
    difficulty: "hard",
    code: `class CircularQueue:
    def __init__(self, capacity):
        self.buf = [None] * capacity
        self.head = 0
        self.tail = 0
        self.count = 0

    def push(self, value):
        if self.count == len(self.buf):
            return False
        self.buf[self.tail] = value
        self.tail = (self.tail + 1) % len(self.buf)
        self.count += 1
        return True

    def pop(self):
        if self.count == 0:
            return None
        value = self.buf[self.head]
        self.head = (self.head + 1) % len(self.buf)
        self.count -= 1
        return value

    def __len__(self):
        return self.count`,
  },
  {
    id: "py-x-21",
    title: "Bank Account Class",
    language: "Python",
    length: "long",
    topic: "oop",
    tags: ["patterns"],
    difficulty: "hard",
    code: `class BankAccount:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self._balance = balance

    def deposit(self, amount):
        if amount <= 0:
            raise ValueError("deposit must be positive")
        self._balance += amount
        return self._balance

    def withdraw(self, amount):
        if amount <= 0:
            raise ValueError("withdrawal must be positive")
        if amount > self._balance:
            raise ValueError("insufficient funds")
        self._balance -= amount
        return self._balance

    @property
    def balance(self):
        return self._balance`,
  },
  {
    id: "py-x-22",
    title: "Shape Inheritance Hierarchy",
    language: "Python",
    length: "long",
    topic: "oop",
    tags: ["patterns"],
    difficulty: "hard",
    code: `from abc import ABC, abstractmethod


class Shape(ABC):
    @abstractmethod
    def area(self):
        raise NotImplementedError

    def describe(self):
        return type(self).__name__ + " area " + str(self.area())


class Circle(Shape):
    def __init__(self, radius):
        self.radius = radius

    def area(self):
        return 3.14159265 * self.radius ** 2


class Rectangle(Shape):
    def __init__(self, width, height):
        self.width = width
        self.height = height

    def area(self):
        return self.width * self.height`,
  },
  {
    id: "py-x-23",
    title: "Dataclass Point Model",
    language: "Python",
    length: "medium",
    topic: "oop",
    tags: ["patterns"],
    difficulty: "medium",
    code: `from dataclasses import dataclass


@dataclass(frozen=True)
class Point:
    x: float
    y: float

    def distance_to(self, other):
        dx = self.x - other.x
        dy = self.y - other.y
        return (dx * dx + dy * dy) ** 0.5`,
  },
  {
    id: "py-x-24",
    title: "Async Gather Tasks",
    language: "Python",
    length: "medium",
    topic: "async",
    tags: ["timing"],
    difficulty: "medium",
    code: `import asyncio


async def fetch(name, delay):
    await asyncio.sleep(delay)
    return name + " done"


async def run_all():
    results = await asyncio.gather(
        fetch("alpha", 0.2),
        fetch("beta", 0.1),
    )
    return results`,
  },
  {
    id: "py-x-25",
    title: "Async Retry With Backoff",
    language: "Python",
    length: "long",
    topic: "async",
    tags: ["timing"],
    difficulty: "hard",
    code: `import asyncio


async def retry(operation, attempts=3):
    delay = 0.1
    last_error = None
    for attempt in range(attempts):
        try:
            return await operation()
        except Exception as error:
            last_error = error
            if attempt == attempts - 1:
                break
            await asyncio.sleep(delay)
            delay *= 2
    raise last_error`,
  },
  {
    id: "py-x-26",
    title: "Async Worker Pool",
    language: "Python",
    length: "long",
    topic: "async",
    tags: ["timing"],
    difficulty: "hard",
    code: `import asyncio


async def worker(name, queue, results):
    while True:
        job = await queue.get()
        if job is None:
            queue.task_done()
            return
        await asyncio.sleep(0.01)
        results.append((name, job * 2))
        queue.task_done()


async def run_pool(jobs, size=3):
    queue = asyncio.Queue()
    results = []
    for job in jobs:
        queue.put_nowait(job)
    for _ in range(size):
        queue.put_nowait(None)
    workers = [asyncio.create_task(worker(i, queue, results))
               for i in range(size)]
    await queue.join()
    await asyncio.gather(*workers)
    return results`,
  },
  {
    id: "py-x-27",
    title: "Tower of Hanoi",
    language: "Python",
    length: "medium",
    topic: "recursion",
    tags: ["backtracking"],
    difficulty: "medium",
    code: `def hanoi(n, source, target, spare, moves=None):
    if moves is None:
        moves = []
    if n == 0:
        return moves
    hanoi(n - 1, source, spare, target, moves)
    moves.append((source, target))
    hanoi(n - 1, spare, target, source, moves)
    return moves`,
  },
  {
    id: "py-x-28",
    title: "Flood Fill Recursion",
    language: "Python",
    length: "medium",
    topic: "graphs",
    tags: ["grid", "recursion"],
    difficulty: "hard",
    code: `def flood_fill(grid, r, c, target, replacement):
    if target == replacement:
        return grid
    if r < 0 or r >= len(grid) or c < 0 or c >= len(grid[0]):
        return grid
    if grid[r][c] != target:
        return grid
    grid[r][c] = replacement
    flood_fill(grid, r + 1, c, target, replacement)
    flood_fill(grid, r - 1, c, target, replacement)
    flood_fill(grid, r, c + 1, target, replacement)
    flood_fill(grid, r, c - 1, target, replacement)
    return grid`,
  },
  {
    id: "py-x-29",
    title: "Count Islands Grid Search",
    language: "Python",
    length: "long",
    topic: "graphs",
    tags: ["grid", "recursion"],
    difficulty: "hard",
    code: `def count_islands(grid):
    if not grid:
        return 0
    rows, cols = len(grid), len(grid[0])

    def sink(r, c):
        if r < 0 or r >= rows or c < 0 or c >= cols:
            return
        if grid[r][c] != "1":
            return
        grid[r][c] = "0"
        sink(r + 1, c)
        sink(r - 1, c)
        sink(r, c + 1)
        sink(r, c - 1)

    total = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == "1":
                total += 1
                sink(r, c)
    return total`,
  },
  {
    id: "py-x-30",
    title: "Longest Palindromic Substring",
    language: "Python",
    length: "medium",
    topic: "trees",
    tags: ["recursion"],
    difficulty: "hard",
    code: `def longest_palindrome(s):
    if not s:
        return ""
    start, best = 0, 1
    for center in range(len(s)):
        for span in (0, 1):
            left, right = center, center + span
            while left >= 0 and right < len(s) and s[left] == s[right]:
                if right - left + 1 > best:
                    best = right - left + 1
                    start = left
                left -= 1
                right += 1
    return s[start:start + best]`,
  },
  {
    id: "py-x-31",
    title: "Set Matrix Zeroes",
    language: "Python",
    length: "medium",
    topic: "matrix",
    tags: ["arrays"],
    difficulty: "medium",
    code: `def set_zeroes(matrix):
    zero_rows = set()
    zero_cols = set()
    for r, row in enumerate(matrix):
        for c, value in enumerate(row):
            if value == 0:
                zero_rows.add(r)
                zero_cols.add(c)
    for r, row in enumerate(matrix):
        for c in range(len(row)):
            if r in zero_rows or c in zero_cols:
                row[c] = 0
    return matrix`,
  },
  {
    id: "py-x-32",
    title: "Word Frequency Sort",
    language: "Python",
    length: "medium",
    topic: "hashing",
    tags: ["counting"],
    difficulty: "medium",
    code: `def top_words(words, k):
    counts = {}
    for word in words:
        counts[word] = counts.get(word, 0) + 1
    ranked = sorted(counts.items(),
                    key=lambda item: (-item[1], item[0]))
    return ranked[:k]`,
  },
  {
    id: "py-x-33",
    title: "Gray Code Sequence",
    language: "Python",
    length: "short",
    topic: "bits",
    tags: ["binary"],
    difficulty: "easy",
    code: `def gray_code(bits):
    return [i ^ (i >> 1) for i in range(1 << bits)]`,
  },
  {
    id: "py-x-34",
    title: "Deque Sliding Window Maximum",
    language: "Python",
    length: "medium",
    topic: "arrays",
    tags: ["indexing"],
    difficulty: "medium",
    code: `from collections import deque


def window_max(nums, k):
    idx = deque()
    out = []
    for i, value in enumerate(nums):
        while idx and idx[0] <= i - k:
            idx.popleft()
        while idx and nums[idx[-1]] <= value:
            idx.pop()
        idx.append(i)
        if i >= k - 1:
            out.append(nums[idx[0]])
    return out`,
  },
  {
    id: "py-x-35",
    title: "Queue Using Two Stacks",
    language: "Python",
    length: "long",
    topic: "stack-queue",
    tags: ["data-structures"],
    difficulty: "hard",
    code: `class QueueFromStacks:
    def __init__(self):
        self.inbox = []
        self.outbox = []

    def _shift(self):
        if not self.outbox:
            while self.inbox:
                self.outbox.append(self.inbox.pop())

    def push(self, value):
        self.inbox.append(value)

    def pop(self):
        self._shift()
        return self.outbox.pop()

    def front(self):
        self._shift()
        return self.outbox[-1]

    def __len__(self):
        return len(self.inbox) + len(self.outbox)`,
  },
  {
    id: "py-x-36",
    title: "Stack Based Expression Evaluation",
    language: "Python",
    length: "long",
    topic: "stack-queue",
    tags: ["data-structures"],
    difficulty: "hard",
    code: `def eval_rpn(tokens):
    stack = []
    operators = {
        "+": lambda a, b: a + b,
        "-": lambda a, b: a - b,
        "*": lambda a, b: a * b,
        "/": lambda a, b: int(a / b),
    }
    for token in tokens:
        if token in operators:
            b = stack.pop()
            a = stack.pop()
            stack.append(operators[token](a, b))
        else:
            stack.append(int(token))
    return stack[0]`,
  },
  {
    id: "py-x-37",
    title: "Reverse Words In Sentence",
    language: "Python",
    length: "short",
    topic: "strings",
    tags: ["text"],
    difficulty: "easy",
    code: `def reverse_words(text):
    return " ".join(reversed(text.split()))`,
  },
  {
    id: "py-x-38",
    title: "Longest Word In String",
    language: "Python",
    length: "short",
    topic: "strings",
    tags: ["text"],
    difficulty: "easy",
    code: `def longest_word(text):
    words = text.split()
    return max(words, key=len) if words else ""`,
  },
  {
    id: "py-x-39",
    title: "Remove Nth From End of Linked List",
    language: "Python",
    length: "medium",
    topic: "linked-list",
    tags: ["pointers"],
    difficulty: "medium",
    code: `def remove_nth(head, n):
    dummy = ListNode(0)
    dummy.next = head
    fast = slow = dummy
    for _ in range(n + 1):
        fast = fast.next
    while fast:
        fast = fast.next
        slow = slow.next
    slow.next = slow.next.next
    return dummy.next`,
  },
  {
    id: "py-x-40",
    title: "Palindrome Linked List",
    language: "Python",
    length: "medium",
    topic: "linked-list",
    tags: ["pointers"],
    difficulty: "medium",
    code: `def is_palindrome_list(head):
    values = []
    node = head
    while node:
        values.append(node.val)
        node = node.next
    left, right = 0, len(values) - 1
    while left < right:
        if values[left] != values[right]:
            return False
        left += 1
        right -= 1
    return True`,
  },
  /* ═══════════════════════════════════════════════════════════
     JavaScript
     ═══════════════════════════════════════════════════════════ */

  {
    id: "js-x-1",
    title: "Is Vowel Character",
    language: "JavaScript",
    length: "short",
    topic: "strings",
    tags: ["text"],
    difficulty: "easy",
    code: `function isVowel(ch) {
  return "aeiou".includes(ch.toLowerCase());
}`,
  },
  {
    id: "js-x-2",
    title: "Ceil Division",
    language: "JavaScript",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `function ceilDiv(a, b) {
  return Math.ceil(a / b);
}`,
  },
  {
    id: "js-x-3",
    title: "Is Perfect Square",
    language: "JavaScript",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `function isPerfectSquare(n) {
  const root = Math.floor(Math.sqrt(n));
  return root * root === n;
}`,
  },
  {
    id: "js-x-4",
    title: "Is Sorted Array",
    language: "JavaScript",
    length: "short",
    topic: "arrays",
    tags: ["indexing"],
    difficulty: "easy",
    code: `function isSorted(items) {
  return items.every((v, i) => i === 0 || items[i - 1] <= v);
}`,
  },
  {
    id: "js-x-5",
    title: "Toggle Nth Bit",
    language: "JavaScript",
    length: "short",
    topic: "bits",
    tags: ["binary"],
    difficulty: "easy",
    code: `function toggleBit(n, pos) {
  return n ^ (1 << pos);
}`,
  },
  {
    id: "js-x-6",
    title: "Isolate Lowest Set Bit",
    language: "JavaScript",
    length: "short",
    topic: "bits",
    tags: ["binary"],
    difficulty: "easy",
    code: `function lowestSetBit(n) {
  return n & -n;
}`,
  },
  {
    id: "js-x-7",
    title: "Round to Nearest Multiple",
    language: "JavaScript",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `function roundTo(value, step) {
  return Math.round(value / step) * step;
}`,
  },
  {
    id: "js-x-8",
    title: "Transpose Matrix",
    language: "JavaScript",
    length: "short",
    topic: "matrix",
    tags: ["arrays"],
    difficulty: "easy",
    code: `function transpose(matrix) {
  return matrix[0].map((_, c) => matrix.map((row) => row[c]));
}`,
  },
  {
    id: "js-x-9",
    title: "Count Character Frequency",
    language: "JavaScript",
    length: "short",
    topic: "hashing",
    tags: ["counting"],
    difficulty: "easy",
    code: `function frequency(text) {
  const counts = {};
  for (const ch of text) counts[ch] = (counts[ch] || 0) + 1;
  return counts;
}`,
  },
  {
    id: "js-x-10",
    title: "Gray Code Sequence",
    language: "JavaScript",
    length: "short",
    topic: "bits",
    tags: ["binary"],
    difficulty: "easy",
    code: `function grayCode(bits) {
  return Array.from({ length: 1 << bits }, (_, i) => i ^ (i >> 1));
}`,
  },
  {
    id: "js-x-11",
    title: "Binary Search First Occurrence",
    language: "JavaScript",
    length: "medium",
    topic: "searching",
    tags: ["arrays"],
    difficulty: "medium",
    code: `function firstOccurrence(items, target) {
  let lo = 0;
  let hi = items.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (items[mid] === target) {
      found = mid;
      hi = mid - 1;
    } else if (items[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return found;
}`,
  },
  {
    id: "js-x-12",
    title: "Search in Rotated Array",
    language: "JavaScript",
    length: "long",
    topic: "searching",
    tags: ["arrays"],
    difficulty: "hard",
    code: `function searchRotated(items, target) {
  let lo = 0;
  let hi = items.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (items[mid] === target) return mid;
    if (items[lo] <= items[mid]) {
      if (items[lo] <= target && target < items[mid]) hi = mid - 1;
      else lo = mid + 1;
    } else {
      if (items[mid] < target && target <= items[hi]) lo = mid + 1;
      else hi = mid - 1;
    }
  }
  return -1;
}`,
  },
  {
    id: "js-x-13",
    title: "Matrix Multiplication",
    language: "JavaScript",
    length: "medium",
    topic: "matrix",
    tags: ["arrays"],
    difficulty: "medium",
    code: `function multiply(a, b) {
  const rows = a.length;
  const cols = b[0].length;
  const inner = b.length;
  const out = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++)
      for (let k = 0; k < inner; k++) out[i][j] += a[i][k] * b[k][j];
  return out;
}`,
  },
  {
    id: "js-x-14",
    title: "Diagonal Matrix Sum",
    language: "JavaScript",
    length: "medium",
    topic: "matrix",
    tags: ["arrays"],
    difficulty: "medium",
    code: `function diagonalSum(matrix) {
  const n = matrix.length;
  let total = 0;
  for (let i = 0; i < n; i++) {
    total += matrix[i][i];
    if (i !== n - 1 - i) total += matrix[i][n - 1 - i];
  }
  return total;
}`,
  },
  {
    id: "js-x-15",
    title: "Set Matrix Zeroes",
    language: "JavaScript",
    length: "long",
    topic: "matrix",
    tags: ["arrays"],
    difficulty: "hard",
    code: `function setZeroes(matrix) {
  const zeroRows = new Set();
  const zeroCols = new Set();
  matrix.forEach((row, r) =>
    row.forEach((value, c) => {
      if (value === 0) {
        zeroRows.add(r);
        zeroCols.add(c);
      }
    })
  );
  matrix.forEach((row, r) =>
    row.forEach((_, c) => {
      if (zeroRows.has(r) || zeroCols.has(c)) row[c] = 0;
    })
  );
  return matrix;
}`,
  },
  {
    id: "js-x-16",
    title: "Min Heap Sift Up",
    language: "JavaScript",
    length: "medium",
    topic: "heap",
    tags: ["data-structures"],
    difficulty: "hard",
    code: `function siftUp(heap, index) {
  while (index > 0) {
    const parent = Math.floor((index - 1) / 2);
    if (heap[parent] <= heap[index]) break;
    [heap[parent], heap[index]] = [heap[index], heap[parent]];
    index = parent;
  }
  return heap;
}`,
  },
  {
    id: "js-x-17",
    title: "Heap Top K Elements",
    language: "JavaScript",
    length: "medium",
    topic: "heap",
    tags: ["data-structures"],
    difficulty: "hard",
    code: `function topK(nums, k) {
  const heap = [];
  for (const value of nums) {
    heap.push(value);
    heap.sort((a, b) => a - b);
    if (heap.length > k) heap.shift();
  }
  return heap.reverse();
}`,
  },
  {
    id: "js-x-18",
    title: "Min Stack With Tracking",
    language: "JavaScript",
    length: "long",
    topic: "stack-queue",
    tags: ["data-structures"],
    difficulty: "hard",
    code: `class MinStack {
  constructor() {
    this.data = [];
    this.mins = [];
  }
  push(value) {
    this.data.push(value);
    if (this.mins.length === 0 || value <= this.mins[this.mins.length - 1]) {
      this.mins.push(value);
    }
  }
  pop() {
    const value = this.data.pop();
    if (value === this.mins[this.mins.length - 1]) this.mins.pop();
    return value;
  }
  getMin() {
    return this.mins[this.mins.length - 1];
  }
}`,
  },
  {
    id: "js-x-19",
    title: "Queue Using Two Stacks",
    language: "JavaScript",
    length: "long",
    topic: "stack-queue",
    tags: ["data-structures"],
    difficulty: "hard",
    code: `class QueueFromStacks {
  constructor() {
    this.inbox = [];
    this.outbox = [];
  }
  shift() {
    if (this.outbox.length === 0) {
      while (this.inbox.length > 0) {
        this.outbox.push(this.inbox.pop());
      }
    }
  }
  push(value) {
    this.inbox.push(value);
  }
  pop() {
    this.shift();
    return this.outbox.pop();
  }
  front() {
    this.shift();
    return this.outbox[this.outbox.length - 1];
  }
  get size() {
    return this.inbox.length + this.outbox.length;
  }
}`,
  },
  {
    id: "js-x-20",
    title: "Circular Buffer Class",
    language: "JavaScript",
    length: "long",
    topic: "oop",
    tags: ["patterns"],
    difficulty: "hard",
    code: `class CircularBuffer {
  constructor(capacity) {
    this.buf = new Array(capacity);
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }

  push(value) {
    if (this.count === this.buf.length) return false;
    this.buf[this.tail] = value;
    this.tail = (this.tail + 1) % this.buf.length;
    this.count++;
    return true;
  }

  pop() {
    if (this.count === 0) return undefined;
    const value = this.buf[this.head];
    this.head = (this.head + 1) % this.buf.length;
    this.count--;
    return value;
  }

  get size() {
    return this.count;
  }
}`,
  },
  {
    id: "js-x-21",
    title: "Bank Account Class",
    language: "JavaScript",
    length: "long",
    topic: "oop",
    tags: ["patterns"],
    difficulty: "hard",
    code: `class BankAccount {
  #balance = 0;

  constructor(owner, opening = 0) {
    this.owner = owner;
    this.#balance = opening;
  }

  deposit(amount) {
    if (amount <= 0) throw new Error("deposit must be positive");
    this.#balance += amount;
    return this.#balance;
  }

  withdraw(amount) {
    if (amount <= 0) throw new Error("withdrawal must be positive");
    if (amount > this.#balance) throw new Error("insufficient funds");
    this.#balance -= amount;
    return this.#balance;
  }

  get balance() {
    return this.#balance;
  }
}`,
  },
  {
    id: "js-x-22",
    title: "Shape Inheritance Hierarchy",
    language: "JavaScript",
    length: "long",
    topic: "oop",
    tags: ["patterns"],
    difficulty: "hard",
    code: `class Shape {
  area() {
    throw new Error("not implemented");
  }
  describe() {
    return this.constructor.name + " area " + this.area().toFixed(2);
  }
}

class Circle extends Shape {
  constructor(radius) {
    super();
    this.radius = radius;
  }
  area() {
    return Math.PI * this.radius * this.radius;
  }
}

class Rectangle extends Shape {
  constructor(width, height) {
    super();
    this.width = width;
    this.height = height;
  }
  area() {
    return this.width * this.height;
  }
}`,
  },
  {
    id: "js-x-23",
    title: "Async Sequential Pipeline",
    language: "JavaScript",
    length: "medium",
    topic: "async",
    tags: ["timing"],
    difficulty: "medium",
    code: `async function pipeline(value, steps) {
  let current = value;
  for (const step of steps) {
    current = await step(current);
  }
  return current;
}`,
  },
  {
    id: "js-x-24",
    title: "Async Timeout Wrapper",
    language: "JavaScript",
    length: "medium",
    topic: "async",
    tags: ["timing"],
    difficulty: "medium",
    code: `function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("timed out")), ms)
  );
  return Promise.race([promise, timeout]);
}`,
  },
  {
    id: "js-x-25",
    title: "Async Queue With Concurrency",
    language: "JavaScript",
    length: "long",
    topic: "async",
    tags: ["timing"],
    difficulty: "hard",
    code: `class AsyncQueue {
  constructor(limit = 2) {
    this.limit = limit;
    this.running = 0;
    this.pending = [];
  }

  add(task) {
    return new Promise((resolve, reject) => {
      this.pending.push({ task, resolve, reject });
      this.next();
    });
  }

  next() {
    if (this.running >= this.limit) return;
    const job = this.pending.shift();
    if (!job) return;
    this.running++;
    job
      .task()
      .then(job.resolve, job.reject)
      .finally(() => {
        this.running--;
        this.next();
      });
  }
}`,
  },
  {
    id: "js-x-26",
    title: "Async Poll Until Ready",
    language: "JavaScript",
    length: "medium",
    topic: "async",
    tags: ["timing"],
    difficulty: "medium",
    code: `async function pollUntil(check, options = {}) {
  const interval = options.interval || 200;
  const attempts = options.attempts || 10;

  for (let i = 0; i < attempts; i++) {
    const result = await check();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error("condition never became true");
}`,
  },
  {
    id: "js-x-27",
    title: "Tower of Hanoi",
    language: "JavaScript",
    length: "medium",
    topic: "recursion",
    tags: ["backtracking"],
    difficulty: "medium",
    code: `function hanoi(n, from, to, spare, moves = []) {
  if (n === 0) return moves;
  hanoi(n - 1, from, spare, to, moves);
  moves.push([from, to]);
  hanoi(n - 1, spare, to, from, moves);
  return moves;
}`,
  },
  {
    id: "js-x-28",
    title: "Flood Fill Recursion",
    language: "JavaScript",
    length: "medium",
    topic: "graphs",
    tags: ["grid", "recursion"],
    difficulty: "hard",
    code: `function floodFill(grid, r, c, target, replacement) {
  if (target === replacement) return grid;
  if (r < 0 || r >= grid.length) return grid;
  if (c < 0 || c >= grid[0].length) return grid;
  if (grid[r][c] !== target) return grid;

  grid[r][c] = replacement;
  floodFill(grid, r + 1, c, target, replacement);
  floodFill(grid, r - 1, c, target, replacement);
  floodFill(grid, r, c + 1, target, replacement);
  floodFill(grid, r, c - 1, target, replacement);
  return grid;
}`,
  },
  {
    id: "js-x-29",
    title: "Count Islands Grid Search",
    language: "JavaScript",
    length: "long",
    topic: "graphs",
    tags: ["grid", "recursion"],
    difficulty: "hard",
    code: `function countIslands(grid) {
  if (grid.length === 0) return 0;
  const rows = grid.length;
  const cols = grid[0].length;

  function sink(r, c) {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return;
    if (grid[r][c] !== "1") return;
    grid[r][c] = "0";
    sink(r + 1, c);
    sink(r - 1, c);
    sink(r, c + 1);
    sink(r, c - 1);
  }

  let total = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === "1") {
        total++;
        sink(r, c);
      }
    }
  }
  return total;
}`,
  },
  {
    id: "js-x-30",
    title: "Longest Palindromic Substring",
    language: "JavaScript",
    length: "long",
    topic: "trees",
    tags: ["recursion"],
    difficulty: "hard",
    code: `function longestPalindrome(s) {
  if (s.length === 0) return "";
  let start = 0;
  let best = 1;
  for (let center = 0; center < s.length; center++) {
    for (const span of [0, 1]) {
      let left = center;
      let right = center + span;
      while (left >= 0 && right < s.length && s[left] === s[right]) {
        if (right - left + 1 > best) {
          best = right - left + 1;
          start = left;
        }
        left--;
        right++;
      }
    }
  }
  return s.slice(start, start + best);
}`,
  },
  {
    id: "js-x-31",
    title: "Deque Sliding Window Maximum",
    language: "JavaScript",
    length: "medium",
    topic: "arrays",
    tags: ["indexing"],
    difficulty: "medium",
    code: `function windowMax(nums, k) {
  const idx = [];
  const out = [];
  for (let i = 0; i < nums.length; i++) {
    while (idx.length > 0 && idx[0] <= i - k) idx.shift();
    while (idx.length > 0 && nums[idx[idx.length - 1]] <= nums[i]) {
      idx.pop();
    }
    idx.push(i);
    if (i >= k - 1) out.push(nums[idx[0]]);
  }
  return out;
}`,
  },
  {
    id: "js-x-32",
    title: "Stack Based Expression Evaluation",
    language: "JavaScript",
    length: "long",
    topic: "stack-queue",
    tags: ["data-structures"],
    difficulty: "hard",
    code: `function evalRPN(tokens) {
  const stack = [];
  const ops = {
    "+": (a, b) => a + b,
    "-": (a, b) => a - b,
    "*": (a, b) => a * b,
    "/": (a, b) => Math.trunc(a / b),
  };
  for (const token of tokens) {
    if (token in ops) {
      const b = stack.pop();
      const a = stack.pop();
      stack.push(ops[token](a, b));
    } else {
      stack.push(Number(token));
    }
  }
  return stack[0];
}`,
  },
  {
    id: "js-x-33",
    title: "Word Frequency Sort",
    language: "JavaScript",
    length: "medium",
    topic: "hashing",
    tags: ["counting"],
    difficulty: "medium",
    code: `function topWords(words, k) {
  const counts = new Map();
  for (const word of words) {
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, k);
}`,
  },
  {
    id: "js-x-34",
    title: "Longest Word In String",
    language: "JavaScript",
    length: "short",
    topic: "strings",
    tags: ["text"],
    difficulty: "easy",
    code: `function longestWord(text) {
  const words = text.split(" ").filter(Boolean);
  return words.reduce((best, w) => (w.length > best.length ? w : best), "");
}`,
  },
  {
    id: "js-x-35",
    title: "Reverse Words In Sentence",
    language: "JavaScript",
    length: "short",
    topic: "strings",
    tags: ["text"],
    difficulty: "easy",
    code: `function reverseWords(text) {
  return text.split(" ").filter(Boolean).reverse().join(" ");
}`,
  },
  {
    id: "js-x-36",
    title: "Remove Nth From End of Linked List",
    language: "JavaScript",
    length: "medium",
    topic: "linked-list",
    tags: ["pointers"],
    difficulty: "medium",
    code: `function removeNth(head, n) {
  const dummy = { next: head };
  let fast = dummy;
  let slow = dummy;
  for (let i = 0; i <= n; i++) fast = fast.next;
  while (fast) {
    fast = fast.next;
    slow = slow.next;
  }
  slow.next = slow.next.next;
  return dummy.next;
}`,
  },
  {
    id: "js-x-37",
    title: "Palindrome Linked List",
    language: "JavaScript",
    length: "medium",
    topic: "linked-list",
    tags: ["pointers"],
    difficulty: "medium",
    code: `function isPalindromeList(head) {
  const values = [];
  for (let node = head; node !== null; node = node.next) {
    values.push(node.value);
  }
  let left = 0;
  let right = values.length - 1;
  while (left < right) {
    if (values[left] !== values[right]) return false;
    left++;
    right--;
  }
  return true;
}`,
  },
  {
    id: "js-x-38",
    title: "Spiral Matrix Traversal",
    language: "JavaScript",
    length: "long",
    topic: "matrix",
    tags: ["arrays"],
    difficulty: "hard",
    code: `function spiral(matrix) {
  const out = [];
  if (matrix.length === 0) return out;
  let top = 0;
  let bottom = matrix.length - 1;
  let left = 0;
  let right = matrix[0].length - 1;

  while (top <= bottom && left <= right) {
    for (let j = left; j <= right; j++) out.push(matrix[top][j]);
    top++;
    for (let i = top; i <= bottom; i++) out.push(matrix[i][right]);
    right--;
    if (top <= bottom) {
      for (let j = right; j >= left; j--) out.push(matrix[bottom][j]);
      bottom--;
    }
    if (left <= right) {
      for (let i = bottom; i >= top; i--) out.push(matrix[i][left]);
      left++;
    }
  }
  return out;
}`,
  },
  {
    id: "js-x-39",
    title: "Binary Search on Answer",
    language: "JavaScript",
    length: "long",
    topic: "searching",
    tags: ["arrays"],
    difficulty: "hard",
    code: `function minCapacity(weights, days) {
  let lo = Math.max(...weights);
  let hi = weights.reduce((a, b) => a + b, 0);

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    let need = 1;
    let load = 0;
    for (const w of weights) {
      if (load + w > mid) {
        need++;
        load = 0;
      }
      load += w;
    }
    if (need > days) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}`,
  },
  {
    id: "js-x-40",
    title: "Rotate Matrix 90 Degrees",
    language: "JavaScript",
    length: "medium",
    topic: "matrix",
    tags: ["arrays"],
    difficulty: "medium",
    code: `function rotate90(matrix) {
  const n = matrix.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      [matrix[i][j], matrix[j][i]] = [matrix[j][i], matrix[i][j]];
    }
  }
  matrix.forEach((row) => row.reverse());
  return matrix;
}`,
  },
];

export default extraSnippets;
