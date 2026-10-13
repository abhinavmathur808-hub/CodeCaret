/* ═══════════════════════════════════════════════════════════════
   codeSnippets.js — Production DSA Code Snippet Dataset
   ─────────────────────────────────────────────────────────────
   300 snippets: 100 C++, 100 Python and 100 JavaScript, each
   categorized by length (short / medium / long) for the /test
   typing simulator.

   The JavaScript set lives in its own module — this file was
   already 3.5k lines — and is appended at the bottom, so every
   consumer still sees one flat array.
   ═══════════════════════════════════════════════════════════════ */

import javascriptSnippets from "./javascriptSnippets";
import extraSnippets from "./extraSnippets";
import topicFillSnippets from "./topicFillSnippets";

const codeSnippets = [

  /* ═══════════════════════════════════════════════════════════
     C++ — SHORT  (33 snippets, 1–5 lines)
     ═══════════════════════════════════════════════════════════ */

  {
    id: "cpp-s-1",
    title: "Swap with XOR",
    language: "C++",
    length: "short",
    topic: "bits",
    tags: ["binary"],
    difficulty: "easy",
    code: `void swap(int &a, int &b) {
  a = a ^ b;
  b = a ^ b;
  a = a ^ b;
}`,
  },
  {
    id: "cpp-s-2",
    title: "Max of Two",
    language: "C++",
    length: "short",
    topic: "basics",
    tags: ["fundamentals"],
    difficulty: "easy",
    code: `int maxOfTwo(int a, int b) {
  return (a > b) ? a : b;
}`,
  },
  {
    id: "cpp-s-3",
    title: "Min of Two",
    language: "C++",
    length: "short",
    topic: "basics",
    tags: ["fundamentals"],
    difficulty: "easy",
    code: `int minOfTwo(int a, int b) {
  return (a < b) ? a : b;
}`,
  },
  {
    id: "cpp-s-4",
    title: "Is Even",
    language: "C++",
    length: "short",
    topic: "basics",
    tags: ["fundamentals"],
    difficulty: "easy",
    code: `bool isEven(int n) {
  return (n & 1) == 0;
}`,
  },
  {
    id: "cpp-s-5",
    title: "Absolute Value",
    language: "C++",
    length: "short",
    topic: "basics",
    tags: ["fundamentals"],
    difficulty: "easy",
    code: `int absVal(int n) {
  return (n < 0) ? -n : n;
}`,
  },
  {
    id: "cpp-s-6",
    title: "Celsius to Fahrenheit",
    language: "C++",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `double toFahrenheit(double celsius) {
  return celsius * 9.0 / 5.0 + 32.0;
}`,
  },
  {
    id: "cpp-s-7",
    title: "Area of Circle",
    language: "C++",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `double circleArea(double radius) {
  return 3.14159265 * radius * radius;
}`,
  },
  {
    id: "cpp-s-8",
    title: "Recursive Factorial",
    language: "C++",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `long long factorial(int n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}`,
  },
  {
    id: "cpp-s-9",
    title: "Is Power of Two",
    language: "C++",
    length: "short",
    topic: "bits",
    tags: ["binary"],
    difficulty: "easy",
    code: `bool isPowerOfTwo(int n) {
  return n > 0 && (n & (n - 1)) == 0;
}`,
  },
  {
    id: "cpp-s-10",
    title: "Count Digits",
    language: "C++",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `int countDigits(int n) {
  int count = 0;
  while (n != 0) { count++; n /= 10; }
  return count;
}`,
  },
  {
    id: "cpp-s-11",
    title: "Sum of Digits",
    language: "C++",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `int sumDigits(int n) {
  int sum = 0;
  while (n > 0) { sum += n % 10; n /= 10; }
  return sum;
}`,
  },
  {
    id: "cpp-s-12",
    title: "GCD (Euclidean)",
    language: "C++",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `int gcd(int a, int b) {
  while (b != 0) { int t = b; b = a % b; a = t; }
  return a;
}`,
  },
  {
    id: "cpp-s-13",
    title: "LCM via GCD",
    language: "C++",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `int lcm(int a, int b) {
  return a / gcd(a, b) * b;
}`,
  },
  {
    id: "cpp-s-14",
    title: "Clamp Value",
    language: "C++",
    length: "short",
    topic: "basics",
    tags: ["fundamentals"],
    difficulty: "easy",
    code: `int clamp(int val, int lo, int hi) {
  if (val < lo) return lo;
  if (val > hi) return hi;
  return val;
}`,
  },
  {
    id: "cpp-s-15",
    title: "Sign Function",
    language: "C++",
    length: "short",
    topic: "basics",
    tags: ["fundamentals"],
    difficulty: "easy",
    code: `int sign(int n) {
  if (n > 0) return 1;
  if (n < 0) return -1;
  return 0;
}`,
  },
  {
    id: "cpp-s-16",
    title: "Toggle Character Case",
    language: "C++",
    length: "short",
    topic: "strings",
    tags: ["text"],
    difficulty: "easy",
    code: `char toggleCase(char c) {
  return c ^ 32;
}`,
  },
  {
    id: "cpp-s-17",
    title: "Is Uppercase",
    language: "C++",
    length: "short",
    topic: "strings",
    tags: ["text"],
    difficulty: "easy",
    code: `bool isUpper(char c) {
  return c >= 'A' && c <= 'Z';
}`,
  },
  {
    id: "cpp-s-18",
    title: "Is Lowercase",
    language: "C++",
    length: "short",
    topic: "strings",
    tags: ["text"],
    difficulty: "easy",
    code: `bool isLower(char c) {
  return c >= 'a' && c <= 'z';
}`,
  },
  {
    id: "cpp-s-19",
    title: "Linear Search",
    language: "C++",
    length: "medium",
    topic: "searching",
    tags: ["arrays"],
    difficulty: "medium",
    code: `int linearSearch(int arr[], int n, int key) {
  for (int i = 0; i < n; i++) {
    if (arr[i] == key) return i;
  }
  return -1;
}`,
  },
  {
    id: "cpp-s-20",
    title: "Max of Three",
    language: "C++",
    length: "medium",
    topic: "basics",
    tags: ["fundamentals"],
    difficulty: "medium",
    code: `int maxOfThree(int a, int b, int c) {
  int mx = a;
  if (b > mx) mx = b;
  if (c > mx) mx = c;
  return mx;
}`,
  },
  {
    id: "cpp-s-21",
    title: "Is Leap Year",
    language: "C++",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `bool isLeapYear(int y) {
  return (y % 4 == 0 && y % 100 != 0) || (y % 400 == 0);
}`,
  },
  {
    id: "cpp-s-22",
    title: "Fibonacci Recursive",
    language: "C++",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `int fib(int n) {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}`,
  },
  {
    id: "cpp-s-23",
    title: "Array Max Element",
    language: "C++",
    length: "medium",
    topic: "arrays",
    tags: ["indexing"],
    difficulty: "medium",
    code: `int arrayMax(int arr[], int n) {
  int mx = arr[0];
  for (int i = 1; i < n; i++)
    if (arr[i] > mx) mx = arr[i];
  return mx;
}`,
  },
  {
    id: "cpp-s-24",
    title: "Array Min Element",
    language: "C++",
    length: "medium",
    topic: "arrays",
    tags: ["indexing"],
    difficulty: "medium",
    code: `int arrayMin(int arr[], int n) {
  int mn = arr[0];
  for (int i = 1; i < n; i++)
    if (arr[i] < mn) mn = arr[i];
  return mn;
}`,
  },
  {
    id: "cpp-s-25",
    title: "Reverse Integer Sign",
    language: "C++",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `int negate(int n) {
  return ~n + 1;
}`,
  },
  {
    id: "cpp-s-26",
    title: "Check Nth Bit",
    language: "C++",
    length: "short",
    topic: "bits",
    tags: ["binary"],
    difficulty: "easy",
    code: `bool checkBit(int num, int n) {
  return (num >> n) & 1;
}`,
  },
  {
    id: "cpp-s-27",
    title: "Set Nth Bit",
    language: "C++",
    length: "short",
    topic: "bits",
    tags: ["binary"],
    difficulty: "easy",
    code: `int setBit(int num, int n) {
  return num | (1 << n);
}`,
  },
  {
    id: "cpp-s-28",
    title: "Clear Nth Bit",
    language: "C++",
    length: "short",
    topic: "bits",
    tags: ["binary"],
    difficulty: "easy",
    code: `int clearBit(int num, int n) {
  return num & ~(1 << n);
}`,
  },
  {
    id: "cpp-s-29",
    title: "Distance Between Points",
    language: "C++",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `double dist(double x1, double y1, double x2, double y2) {
  double dx = x2 - x1, dy = y2 - y1;
  return sqrt(dx * dx + dy * dy);
}`,
  },
  {
    id: "cpp-s-30",
    title: "Swap Using Temp",
    language: "C++",
    length: "short",
    topic: "basics",
    tags: ["fundamentals"],
    difficulty: "easy",
    code: `void swap(int &a, int &b) {
  int temp = a;
  a = b;
  b = temp;
}`,
  },
  {
    id: "cpp-s-31",
    title: "Reverse Number",
    language: "C++",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `int reverseNum(int n) {
  int rev = 0;
  while (n != 0) { rev = rev * 10 + n % 10; n /= 10; }
  return rev;
}`,
  },
  {
    id: "cpp-s-32",
    title: "Is Palindrome Number",
    language: "C++",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `bool isPalindrome(int n) {
  int orig = n, rev = 0;
  while (n > 0) { rev = rev * 10 + n % 10; n /= 10; }
  return orig == rev;
}`,
  },
  {
    id: "cpp-s-33",
    title: "Square Root (Integer)",
    language: "C++",
    length: "medium",
    topic: "math",
    tags: ["numbers"],
    difficulty: "medium",
    code: `int intSqrt(int n) {
  int lo = 0, hi = n;
  while (lo <= hi) {
    long mid = lo + (hi - lo) / 2;
    if (mid * mid <= n) lo = mid + 1; else hi = mid - 1;
  }
  return hi;
}`,
  },

  /* ═══════════════════════════════════════════════════════════
     C++ — MEDIUM  (34 snippets, 6–15 lines)
     ═══════════════════════════════════════════════════════════ */

  {
    id: "cpp-m-1",
    title: "Iterative Binary Search",
    language: "C++",
    length: "medium",
    topic: "searching",
    tags: ["arrays"],
    difficulty: "medium",
    code: `int binarySearch(int arr[], int n, int target) {
  int low = 0, high = n - 1;
  while (low <= high) {
    int mid = low + (high - low) / 2;
    if (arr[mid] == target) return mid;
    else if (arr[mid] < target) low = mid + 1;
    else high = mid - 1;
  }
  return -1;
}`,
  },
  {
    id: "cpp-m-2",
    title: "Bubble Sort",
    language: "C++",
    length: "medium",
    topic: "sorting",
    tags: ["arrays"],
    difficulty: "medium",
    code: `void bubbleSort(int arr[], int n) {
  for (int i = 0; i < n - 1; i++) {
    bool swapped = false;
    for (int j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        swap(arr[j], arr[j + 1]);
        swapped = true;
      }
    }
    if (!swapped) break;
  }
}`,
  },
  {
    id: "cpp-m-3",
    title: "Selection Sort",
    language: "C++",
    length: "medium",
    topic: "sorting",
    tags: ["arrays"],
    difficulty: "medium",
    code: `void selectionSort(int arr[], int n) {
  for (int i = 0; i < n - 1; i++) {
    int minIdx = i;
    for (int j = i + 1; j < n; j++) {
      if (arr[j] < arr[minIdx]) minIdx = j;
    }
    swap(arr[i], arr[minIdx]);
  }
}`,
  },
  {
    id: "cpp-m-4",
    title: "Insertion Sort",
    language: "C++",
    length: "medium",
    topic: "sorting",
    tags: ["arrays"],
    difficulty: "medium",
    code: `void insertionSort(int arr[], int n) {
  for (int i = 1; i < n; i++) {
    int key = arr[i];
    int j = i - 1;
    while (j >= 0 && arr[j] > key) {
      arr[j + 1] = arr[j];
      j--;
    }
    arr[j + 1] = key;
  }
}`,
  },
  {
    id: "cpp-m-5",
    title: "Reverse a Singly Linked List",
    language: "C++",
    length: "medium",
    topic: "linked-list",
    tags: ["pointers"],
    difficulty: "medium",
    code: `ListNode* reverseList(ListNode* head) {
  ListNode* prev = nullptr;
  ListNode* curr = head;
  while (curr != nullptr) {
    ListNode* next = curr->next;
    curr->next = prev;
    prev = curr;
    curr = next;
  }
  return prev;
}`,
  },
  {
    id: "cpp-m-6",
    title: "Two Sum (unordered_map)",
    language: "C++",
    length: "medium",
    topic: "hashing",
    tags: ["arrays"],
    difficulty: "medium",
    code: `vector<int> twoSum(vector<int>& nums, int target) {
  unordered_map<int, int> seen;
  for (int i = 0; i < nums.size(); i++) {
    int complement = target - nums[i];
    if (seen.count(complement)) {
      return {seen[complement], i};
    }
    seen[nums[i]] = i;
  }
  return {};
}`,
  },
  {
    id: "cpp-m-7",
    title: "Palindrome Check (String)",
    language: "C++",
    length: "medium",
    topic: "strings",
    tags: ["text"],
    difficulty: "medium",
    code: `bool isPalindrome(string s) {
  int left = 0, right = s.size() - 1;
  while (left < right) {
    if (s[left] != s[right]) return false;
    left++;
    right--;
  }
  return true;
}`,
  },
  {
    id: "cpp-m-8",
    title: "Count Occurrences",
    language: "C++",
    length: "medium",
    topic: "hashing",
    tags: ["counting"],
    difficulty: "medium",
    code: `int countOccurrences(int arr[], int n, int target) {
  int count = 0;
  for (int i = 0; i < n; i++) {
    if (arr[i] == target) count++;
  }
  return count;
}`,
  },
  {
    id: "cpp-m-9",
    title: "Remove Duplicates (Sorted Array)",
    language: "C++",
    length: "medium",
    topic: "arrays",
    tags: ["indexing"],
    difficulty: "medium",
    code: `int removeDuplicates(vector<int>& nums) {
  if (nums.empty()) return 0;
  int k = 1;
  for (int i = 1; i < nums.size(); i++) {
    if (nums[i] != nums[i - 1]) {
      nums[k] = nums[i];
      k++;
    }
  }
  return k;
}`,
  },
  {
    id: "cpp-m-10",
    title: "Kadane's Max Subarray",
    language: "C++",
    length: "medium",
    topic: "dp",
    tags: ["optimisation"],
    difficulty: "hard",
    code: `int maxSubarraySum(vector<int>& nums) {
  int maxSum = nums[0], currSum = nums[0];
  for (int i = 1; i < nums.size(); i++) {
    currSum = max(nums[i], currSum + nums[i]);
    maxSum = max(maxSum, currSum);
  }
  return maxSum;
}`,
  },
  {
    id: "cpp-m-11",
    title: "Rotate Array Left",
    language: "C++",
    length: "medium",
    topic: "arrays",
    tags: ["indexing"],
    difficulty: "medium",
    code: `void rotateLeft(int arr[], int n, int k) {
  k = k % n;
  reverse(arr, arr + k);
  reverse(arr + k, arr + n);
  reverse(arr, arr + n);
}`,
  },
  {
    id: "cpp-m-12",
    title: "Matrix Transpose",
    language: "C++",
    length: "medium",
    topic: "matrix",
    tags: ["arrays"],
    difficulty: "medium",
    code: `void transpose(vector<vector<int>>& matrix) {
  int n = matrix.size();
  for (int i = 0; i < n; i++) {
    for (int j = i + 1; j < n; j++) {
      swap(matrix[i][j], matrix[j][i]);
    }
  }
}`,
  },
  {
    id: "cpp-m-13",
    title: "Fast Exponentiation",
    language: "C++",
    length: "medium",
    topic: "math",
    tags: ["numbers"],
    difficulty: "medium",
    code: `long long power(long long base, int exp, int mod) {
  long long result = 1;
  base %= mod;
  while (exp > 0) {
    if (exp & 1) result = result * base % mod;
    base = base * base % mod;
    exp >>= 1;
  }
  return result;
}`,
  },
  {
    id: "cpp-m-14",
    title: "Binary to Decimal",
    language: "C++",
    length: "medium",
    topic: "bits",
    tags: ["binary"],
    difficulty: "medium",
    code: `int binaryToDecimal(string bin) {
  int result = 0;
  for (int i = 0; i < bin.size(); i++) {
    result = result * 2 + (bin[i] - '0');
  }
  return result;
}`,
  },
  {
    id: "cpp-m-15",
    title: "Reverse String In-Place",
    language: "C++",
    length: "medium",
    topic: "strings",
    tags: ["text"],
    difficulty: "medium",
    code: `void reverseString(string &s) {
  int left = 0, right = s.size() - 1;
  while (left < right) {
    char temp = s[left];
    s[left] = s[right];
    s[right] = temp;
    left++;
    right--;
  }
}`,
  },
  {
    id: "cpp-m-16",
    title: "Check Anagram",
    language: "C++",
    length: "medium",
    topic: "hashing",
    tags: ["counting"],
    difficulty: "medium",
    code: `bool isAnagram(string s, string t) {
  if (s.size() != t.size()) return false;
  int freq[26] = {0};
  for (char c : s) freq[c - 'a']++;
  for (char c : t) freq[c - 'a']--;
  for (int i = 0; i < 26; i++) {
    if (freq[i] != 0) return false;
  }
  return true;
}`,
  },
  {
    id: "cpp-m-17",
    title: "Valid Parentheses",
    language: "C++",
    length: "medium",
    topic: "stack-queue",
    tags: ["data-structures"],
    difficulty: "medium",
    code: `bool isValid(string s) {
  stack<char> stk;
  for (char c : s) {
    if (c == '(' || c == '{' || c == '[') stk.push(c);
    else {
      if (stk.empty()) return false;
      char top = stk.top(); stk.pop();
      if (c == ')' && top != '(') return false;
      if (c == '}' && top != '{') return false;
      if (c == ']' && top != '[') return false;
    }
  }
  return stk.empty();
}`,
  },
  {
    id: "cpp-m-18",
    title: "Find Middle of Linked List",
    language: "C++",
    length: "medium",
    topic: "linked-list",
    tags: ["pointers"],
    difficulty: "medium",
    code: `ListNode* findMiddle(ListNode* head) {
  ListNode* slow = head;
  ListNode* fast = head;
  while (fast != nullptr && fast->next != nullptr) {
    slow = slow->next;
    fast = fast->next->next;
  }
  return slow;
}`,
  },
  {
    id: "cpp-m-19",
    title: "Detect Cycle in Linked List",
    language: "C++",
    length: "medium",
    topic: "linked-list",
    tags: ["pointers"],
    difficulty: "medium",
    code: `bool hasCycle(ListNode* head) {
  ListNode* slow = head;
  ListNode* fast = head;
  while (fast != nullptr && fast->next != nullptr) {
    slow = slow->next;
    fast = fast->next->next;
    if (slow == fast) return true;
  }
  return false;
}`,
  },
  {
    id: "cpp-m-20",
    title: "Merge Two Sorted Arrays",
    language: "C++",
    length: "medium",
    topic: "arrays",
    tags: ["indexing"],
    difficulty: "medium",
    code: `vector<int> mergeSorted(vector<int>& a, vector<int>& b) {
  vector<int> result;
  int i = 0, j = 0;
  while (i < a.size() && j < b.size()) {
    if (a[i] <= b[j]) result.push_back(a[i++]);
    else result.push_back(b[j++]);
  }
  while (i < a.size()) result.push_back(a[i++]);
  while (j < b.size()) result.push_back(b[j++]);
  return result;
}`,
  },
  {
    id: "cpp-m-21",
    title: "Count Set Bits",
    language: "C++",
    length: "medium",
    topic: "bits",
    tags: ["binary"],
    difficulty: "medium",
    code: `int countSetBits(int n) {
  int count = 0;
  while (n > 0) {
    count += n & 1;
    n >>= 1;
  }
  return count;
}`,
  },
  {
    id: "cpp-m-22",
    title: "Dutch National Flag",
    language: "C++",
    length: "medium",
    topic: "sorting",
    tags: ["arrays"],
    difficulty: "medium",
    code: `void sortColors(vector<int>& nums) {
  int lo = 0, mid = 0, hi = nums.size() - 1;
  while (mid <= hi) {
    if (nums[mid] == 0) swap(nums[lo++], nums[mid++]);
    else if (nums[mid] == 1) mid++;
    else swap(nums[mid], nums[hi--]);
  }
}`,
  },
  {
    id: "cpp-m-23",
    title: "Sliding Window Max Sum",
    language: "C++",
    length: "medium",
    topic: "arrays",
    tags: ["indexing"],
    difficulty: "medium",
    code: `int maxSumWindow(vector<int>& arr, int k) {
  int windowSum = 0;
  for (int i = 0; i < k; i++) windowSum += arr[i];
  int maxSum = windowSum;
  for (int i = k; i < arr.size(); i++) {
    windowSum += arr[i] - arr[i - k];
    maxSum = max(maxSum, windowSum);
  }
  return maxSum;
}`,
  },
  {
    id: "cpp-m-24",
    title: "Two Pointer Pair Sum",
    language: "C++",
    length: "medium",
    topic: "arrays",
    tags: ["indexing"],
    difficulty: "medium",
    code: `pair<int,int> pairSum(vector<int>& arr, int target) {
  int left = 0, right = arr.size() - 1;
  while (left < right) {
    int sum = arr[left] + arr[right];
    if (sum == target) return {left, right};
    else if (sum < target) left++;
    else right--;
  }
  return {-1, -1};
}`,
  },
  {
    id: "cpp-m-25",
    title: "Inorder Traversal",
    language: "C++",
    length: "medium",
    topic: "trees",
    tags: ["recursion"],
    difficulty: "hard",
    code: `void inorder(TreeNode* root, vector<int>& result) {
  if (root == nullptr) return;
  inorder(root->left, result);
  result.push_back(root->val);
  inorder(root->right, result);
}`,
  },
  {
    id: "cpp-m-26",
    title: "Preorder Traversal",
    language: "C++",
    length: "medium",
    topic: "trees",
    tags: ["recursion"],
    difficulty: "hard",
    code: `void preorder(TreeNode* root, vector<int>& result) {
  if (root == nullptr) return;
  result.push_back(root->val);
  preorder(root->left, result);
  preorder(root->right, result);
}`,
  },
  {
    id: "cpp-m-27",
    title: "Stack Push and Pop",
    language: "C++",
    length: "medium",
    topic: "stack-queue",
    tags: ["data-structures"],
    difficulty: "medium",
    code: `class Stack {
  int arr[1000];
  int top;
public:
  Stack() : top(-1) {}
  void push(int x) { arr[++top] = x; }
  int pop() { return arr[top--]; }
  int peek() { return arr[top]; }
  bool empty() { return top == -1; }
};`,
  },
  {
    id: "cpp-m-28",
    title: "Queue Using Array",
    language: "C++",
    length: "medium",
    topic: "stack-queue",
    tags: ["data-structures"],
    difficulty: "medium",
    code: `class Queue {
  int arr[1000];
  int front, rear;
public:
  Queue() : front(0), rear(0) {}
  void enqueue(int x) { arr[rear++] = x; }
  int dequeue() { return arr[front++]; }
  int peek() { return arr[front]; }
  bool empty() { return front == rear; }
};`,
  },
  {
    id: "cpp-m-29",
    title: "Binary Tree Height",
    language: "C++",
    length: "medium",
    topic: "trees",
    tags: ["recursion"],
    difficulty: "hard",
    code: `int height(TreeNode* root) {
  if (root == nullptr) return 0;
  int leftH = height(root->left);
  int rightH = height(root->right);
  return 1 + max(leftH, rightH);
}`,
  },
  {
    id: "cpp-m-30",
    title: "Level Order Traversal",
    language: "C++",
    length: "medium",
    topic: "trees",
    tags: ["recursion"],
    difficulty: "hard",
    code: `void levelOrder(TreeNode* root) {
  if (!root) return;
  queue<TreeNode*> q;
  q.push(root);
  while (!q.empty()) {
    TreeNode* node = q.front();
    q.pop();
    cout << node->val << " ";
    if (node->left) q.push(node->left);
    if (node->right) q.push(node->right);
  }
}`,
  },
  {
    id: "cpp-m-31",
    title: "Sieve of Eratosthenes",
    language: "C++",
    length: "medium",
    topic: "math",
    tags: ["numbers"],
    difficulty: "medium",
    code: `vector<int> sieve(int n) {
  vector<bool> is_prime(n + 1, true);
  is_prime[0] = is_prime[1] = false;
  for (int i = 2; i * i <= n; i++) {
    if (is_prime[i]) {
      for (int j = i * i; j <= n; j += i)
        is_prime[j] = false;
    }
  }
  vector<int> primes;
  for (int i = 2; i <= n; i++)
    if (is_prime[i]) primes.push_back(i);
  return primes;
}`,
  },
  {
    id: "cpp-m-32",
    title: "Next Greater Element",
    language: "C++",
    length: "medium",
    topic: "stack-queue",
    tags: ["data-structures"],
    difficulty: "medium",
    code: `vector<int> nextGreater(vector<int>& arr) {
  int n = arr.size();
  vector<int> result(n, -1);
  stack<int> stk;
  for (int i = 0; i < n; i++) {
    while (!stk.empty() && arr[stk.top()] < arr[i]) {
      result[stk.top()] = arr[i];
      stk.pop();
    }
    stk.push(i);
  }
  return result;
}`,
  },
  {
    id: "cpp-m-33",
    title: "Power Set (Bit Masking)",
    language: "C++",
    length: "medium",
    topic: "bits",
    tags: ["recursion", "subsets"],
    difficulty: "medium",
    code: `vector<vector<int>> powerSet(vector<int>& nums) {
  int n = nums.size();
  int total = 1 << n;
  vector<vector<int>> result;
  for (int mask = 0; mask < total; mask++) {
    vector<int> subset;
    for (int i = 0; i < n; i++) {
      if (mask & (1 << i)) subset.push_back(nums[i]);
    }
    result.push_back(subset);
  }
  return result;
}`,
  },
  {
    id: "cpp-m-34",
    title: "Reverse Linked List (Recursive)",
    language: "C++",
    length: "medium",
    topic: "linked-list",
    tags: ["pointers"],
    difficulty: "medium",
    code: `ListNode* reverseList(ListNode* head) {
  if (head == nullptr || head->next == nullptr)
    return head;
  ListNode* rest = reverseList(head->next);
  head->next->next = head;
  head->next = nullptr;
  return rest;
}`,
  },

  /* ═══════════════════════════════════════════════════════════
     C++ — LONG  (33 snippets, 16+ lines)
     ═══════════════════════════════════════════════════════════ */

  {
    id: "cpp-l-1",
    title: "Merge Sort",
    language: "C++",
    length: "long",
    topic: "sorting",
    tags: ["arrays"],
    difficulty: "hard",
    code: `void merge(int arr[], int left, int mid, int right) {
  int n1 = mid - left + 1;
  int n2 = right - mid;
  vector<int> L(n1), R(n2);
  for (int i = 0; i < n1; i++) L[i] = arr[left + i];
  for (int j = 0; j < n2; j++) R[j] = arr[mid + 1 + j];
  int i = 0, j = 0, k = left;
  while (i < n1 && j < n2) {
    if (L[i] <= R[j]) arr[k++] = L[i++];
    else arr[k++] = R[j++];
  }
  while (i < n1) arr[k++] = L[i++];
  while (j < n2) arr[k++] = R[j++];
}

void mergeSort(int arr[], int left, int right) {
  if (left < right) {
    int mid = left + (right - left) / 2;
    mergeSort(arr, left, mid);
    mergeSort(arr, mid + 1, right);
    merge(arr, left, mid, right);
  }
}`,
  },
  {
    id: "cpp-l-2",
    title: "Quick Sort",
    language: "C++",
    length: "long",
    topic: "sorting",
    tags: ["arrays"],
    difficulty: "hard",
    code: `int partition(int arr[], int low, int high) {
  int pivot = arr[high];
  int i = low - 1;
  for (int j = low; j < high; j++) {
    if (arr[j] < pivot) {
      i++;
      swap(arr[i], arr[j]);
    }
  }
  swap(arr[i + 1], arr[high]);
  return i + 1;
}

void quickSort(int arr[], int low, int high) {
  if (low < high) {
    int pi = partition(arr, low, high);
    quickSort(arr, low, pi - 1);
    quickSort(arr, pi + 1, high);
  }
}`,
  },
  {
    id: "cpp-l-3",
    title: "Heap Sort",
    language: "C++",
    length: "long",
    topic: "sorting",
    tags: ["heap"],
    difficulty: "hard",
    code: `void heapify(int arr[], int n, int i) {
  int largest = i;
  int left = 2 * i + 1;
  int right = 2 * i + 2;
  if (left < n && arr[left] > arr[largest])
    largest = left;
  if (right < n && arr[right] > arr[largest])
    largest = right;
  if (largest != i) {
    swap(arr[i], arr[largest]);
    heapify(arr, n, largest);
  }
}

void heapSort(int arr[], int n) {
  for (int i = n / 2 - 1; i >= 0; i--)
    heapify(arr, n, i);
  for (int i = n - 1; i > 0; i--) {
    swap(arr[0], arr[i]);
    heapify(arr, i, 0);
  }
}`,
  },
  {
    id: "cpp-l-4",
    title: "Counting Sort",
    language: "C++",
    length: "long",
    topic: "sorting",
    tags: ["arrays"],
    difficulty: "hard",
    code: `void countingSort(int arr[], int n) {
  int maxVal = *max_element(arr, arr + n);
  int minVal = *min_element(arr, arr + n);
  int range = maxVal - minVal + 1;
  vector<int> count(range, 0);
  vector<int> output(n);
  for (int i = 0; i < n; i++)
    count[arr[i] - minVal]++;
  for (int i = 1; i < range; i++)
    count[i] += count[i - 1];
  for (int i = n - 1; i >= 0; i--) {
    output[count[arr[i] - minVal] - 1] = arr[i];
    count[arr[i] - minVal]--;
  }
  for (int i = 0; i < n; i++)
    arr[i] = output[i];
}`,
  },
  {
    id: "cpp-l-5",
    title: "Radix Sort",
    language: "C++",
    length: "long",
    topic: "sorting",
    tags: ["arrays"],
    difficulty: "hard",
    code: `void countSort(int arr[], int n, int exp) {
  vector<int> output(n);
  int count[10] = {0};
  for (int i = 0; i < n; i++)
    count[(arr[i] / exp) % 10]++;
  for (int i = 1; i < 10; i++)
    count[i] += count[i - 1];
  for (int i = n - 1; i >= 0; i--) {
    output[count[(arr[i] / exp) % 10] - 1] = arr[i];
    count[(arr[i] / exp) % 10]--;
  }
  for (int i = 0; i < n; i++)
    arr[i] = output[i];
}

void radixSort(int arr[], int n) {
  int mx = *max_element(arr, arr + n);
  for (int exp = 1; mx / exp > 0; exp *= 10)
    countSort(arr, n, exp);
}`,
  },
  {
    id: "cpp-l-6",
    title: "Dijkstra's Algorithm",
    language: "C++",
    length: "long",
    topic: "graphs",
    tags: ["traversal"],
    difficulty: "hard",
    code: `vector<int> dijkstra(int src, int V,
    vector<vector<pair<int,int>>>& adj) {
  vector<int> dist(V, INT_MAX);
  priority_queue<pair<int,int>,
    vector<pair<int,int>>,
    greater<pair<int,int>>> pq;
  dist[src] = 0;
  pq.push({0, src});
  while (!pq.empty()) {
    auto [d, u] = pq.top();
    pq.pop();
    if (d > dist[u]) continue;
    for (auto& [v, w] : adj[u]) {
      if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        pq.push({dist[v], v});
      }
    }
  }
  return dist;
}`,
  },
  {
    id: "cpp-l-7",
    title: "BFS Graph Traversal",
    language: "C++",
    length: "long",
    topic: "graphs",
    tags: ["traversal"],
    difficulty: "hard",
    code: `void bfs(int start, int V,
    vector<vector<int>>& adj) {
  vector<bool> visited(V, false);
  queue<int> q;
  visited[start] = true;
  q.push(start);
  while (!q.empty()) {
    int node = q.front();
    q.pop();
    cout << node << " ";
    for (int neighbor : adj[node]) {
      if (!visited[neighbor]) {
        visited[neighbor] = true;
        q.push(neighbor);
      }
    }
  }
}`,
  },
  {
    id: "cpp-l-8",
    title: "DFS Graph Traversal",
    language: "C++",
    length: "long",
    topic: "graphs",
    tags: ["traversal"],
    difficulty: "hard",
    code: `void dfs(int node, vector<vector<int>>& adj,
    vector<bool>& visited) {
  visited[node] = true;
  cout << node << " ";
  for (int neighbor : adj[node]) {
    if (!visited[neighbor]) {
      dfs(neighbor, adj, visited);
    }
  }
}

void traverseGraph(int V,
    vector<vector<int>>& adj) {
  vector<bool> visited(V, false);
  for (int i = 0; i < V; i++) {
    if (!visited[i]) {
      dfs(i, adj, visited);
    }
  }
}`,
  },
  {
    id: "cpp-l-9",
    title: "Topological Sort (DFS)",
    language: "C++",
    length: "long",
    topic: "graphs",
    tags: ["traversal"],
    difficulty: "hard",
    code: `void topoHelper(int node, vector<vector<int>>& adj,
    vector<bool>& visited, stack<int>& stk) {
  visited[node] = true;
  for (int neighbor : adj[node]) {
    if (!visited[neighbor]) {
      topoHelper(neighbor, adj, visited, stk);
    }
  }
  stk.push(node);
}

vector<int> topologicalSort(int V,
    vector<vector<int>>& adj) {
  vector<bool> visited(V, false);
  stack<int> stk;
  for (int i = 0; i < V; i++) {
    if (!visited[i])
      topoHelper(i, adj, visited, stk);
  }
  vector<int> order;
  while (!stk.empty()) {
    order.push_back(stk.top());
    stk.pop();
  }
  return order;
}`,
  },
  {
    id: "cpp-l-10",
    title: "Bellman-Ford Algorithm",
    language: "C++",
    length: "long",
    topic: "graphs",
    tags: ["traversal"],
    difficulty: "hard",
    code: `struct Edge { int u, v, w; };

vector<int> bellmanFord(int src, int V,
    vector<Edge>& edges) {
  vector<int> dist(V, INT_MAX);
  dist[src] = 0;
  for (int i = 0; i < V - 1; i++) {
    for (auto& e : edges) {
      if (dist[e.u] != INT_MAX &&
          dist[e.u] + e.w < dist[e.v]) {
        dist[e.v] = dist[e.u] + e.w;
      }
    }
  }
  for (auto& e : edges) {
    if (dist[e.u] != INT_MAX &&
        dist[e.u] + e.w < dist[e.v]) {
      return {};
    }
  }
  return dist;
}`,
  },
  {
    id: "cpp-l-11",
    title: "Floyd-Warshall Algorithm",
    language: "C++",
    length: "medium",
    topic: "graphs",
    tags: ["traversal"],
    difficulty: "hard",
    code: `void floydWarshall(vector<vector<int>>& dist,
    int V) {
  for (int k = 0; k < V; k++) {
    for (int i = 0; i < V; i++) {
      for (int j = 0; j < V; j++) {
        if (dist[i][k] != INT_MAX &&
            dist[k][j] != INT_MAX &&
            dist[i][k] + dist[k][j] < dist[i][j]) {
          dist[i][j] = dist[i][k] + dist[k][j];
        }
      }
    }
  }
}`,
  },
  {
    id: "cpp-l-12",
    title: "Kruskal's Algorithm",
    language: "C++",
    length: "long",
    topic: "graphs",
    tags: ["traversal"],
    difficulty: "hard",
    code: `int parent[1000], rnk[1000];

int find(int x) {
  if (parent[x] != x) parent[x] = find(parent[x]);
  return parent[x];
}

void unite(int x, int y) {
  int px = find(x), py = find(y);
  if (px == py) return;
  if (rnk[px] < rnk[py]) swap(px, py);
  parent[py] = px;
  if (rnk[px] == rnk[py]) rnk[px]++;
}

int kruskal(int V, vector<tuple<int,int,int>>& edges) {
  sort(edges.begin(), edges.end());
  for (int i = 0; i < V; i++) { parent[i] = i; rnk[i] = 0; }
  int mstWeight = 0, edgeCount = 0;
  for (auto& [w, u, v] : edges) {
    if (find(u) != find(v)) {
      unite(u, v);
      mstWeight += w;
      if (++edgeCount == V - 1) break;
    }
  }
  return mstWeight;
}`,
  },
  {
    id: "cpp-l-13",
    title: "Prim's Algorithm",
    language: "C++",
    length: "long",
    topic: "graphs",
    tags: ["traversal"],
    difficulty: "hard",
    code: `int primMST(int V, vector<vector<pair<int,int>>>& adj) {
  vector<int> key(V, INT_MAX);
  vector<bool> inMST(V, false);
  priority_queue<pair<int,int>,
    vector<pair<int,int>>,
    greater<pair<int,int>>> pq;
  key[0] = 0;
  pq.push({0, 0});
  int totalWeight = 0;
  while (!pq.empty()) {
    auto [w, u] = pq.top();
    pq.pop();
    if (inMST[u]) continue;
    inMST[u] = true;
    totalWeight += w;
    for (auto& [v, wt] : adj[u]) {
      if (!inMST[v] && wt < key[v]) {
        key[v] = wt;
        pq.push({wt, v});
      }
    }
  }
  return totalWeight;
}`,
  },
  {
    id: "cpp-l-14",
    title: "BST Insert and Search",
    language: "C++",
    length: "long",
    topic: "trees",
    tags: ["recursion"],
    difficulty: "hard",
    code: `struct BSTNode {
  int val;
  BSTNode *left, *right;
  BSTNode(int x) : val(x), left(nullptr), right(nullptr) {}
};

BSTNode* insert(BSTNode* root, int val) {
  if (root == nullptr) return new BSTNode(val);
  if (val < root->val)
    root->left = insert(root->left, val);
  else
    root->right = insert(root->right, val);
  return root;
}

bool search(BSTNode* root, int val) {
  if (root == nullptr) return false;
  if (root->val == val) return true;
  if (val < root->val) return search(root->left, val);
  return search(root->right, val);
}`,
  },
  {
    id: "cpp-l-15",
    title: "Trie Insert and Search",
    language: "C++",
    length: "long",
    topic: "trees",
    tags: ["recursion"],
    difficulty: "hard",
    code: `struct TrieNode {
  TrieNode* children[26];
  bool isEnd;
  TrieNode() : isEnd(false) {
    for (int i = 0; i < 26; i++)
      children[i] = nullptr;
  }
};

void insert(TrieNode* root, string word) {
  TrieNode* curr = root;
  for (char c : word) {
    int idx = c - 'a';
    if (!curr->children[idx])
      curr->children[idx] = new TrieNode();
    curr = curr->children[idx];
  }
  curr->isEnd = true;
}

bool search(TrieNode* root, string word) {
  TrieNode* curr = root;
  for (char c : word) {
    int idx = c - 'a';
    if (!curr->children[idx]) return false;
    curr = curr->children[idx];
  }
  return curr->isEnd;
}`,
  },
  {
    id: "cpp-l-16",
    title: "LRU Cache",
    language: "C++",
    length: "long",
    topic: "hashing",
    tags: ["counting"],
    difficulty: "hard",
    code: `class LRUCache {
  int capacity;
  list<pair<int,int>> dll;
  unordered_map<int, list<pair<int,int>>::iterator> cache;
public:
  LRUCache(int cap) : capacity(cap) {}

  int get(int key) {
    if (cache.find(key) == cache.end()) return -1;
    dll.splice(dll.begin(), dll, cache[key]);
    return cache[key]->second;
  }

  void put(int key, int value) {
    if (cache.find(key) != cache.end()) {
      cache[key]->second = value;
      dll.splice(dll.begin(), dll, cache[key]);
      return;
    }
    if (dll.size() == capacity) {
      cache.erase(dll.back().first);
      dll.pop_back();
    }
    dll.push_front({key, value});
    cache[key] = dll.begin();
  }
};`,
  },
  {
    id: "cpp-l-17",
    title: "0/1 Knapsack (DP)",
    language: "C++",
    length: "medium",
    topic: "dp",
    tags: ["optimisation"],
    difficulty: "hard",
    code: `int knapsack(int W, vector<int>& wt,
    vector<int>& val, int n) {
  vector<vector<int>> dp(n + 1,
    vector<int>(W + 1, 0));
  for (int i = 1; i <= n; i++) {
    for (int w = 0; w <= W; w++) {
      dp[i][w] = dp[i - 1][w];
      if (wt[i - 1] <= w) {
        dp[i][w] = max(dp[i][w],
          dp[i - 1][w - wt[i - 1]] + val[i - 1]);
      }
    }
  }
  return dp[n][W];
}`,
  },
  {
    id: "cpp-l-18",
    title: "Longest Common Subsequence",
    language: "C++",
    length: "medium",
    topic: "dp",
    tags: ["optimisation"],
    difficulty: "hard",
    code: `int lcs(string a, string b) {
  int m = a.size(), n = b.size();
  vector<vector<int>> dp(m + 1,
    vector<int>(n + 1, 0));
  for (int i = 1; i <= m; i++) {
    for (int j = 1; j <= n; j++) {
      if (a[i - 1] == b[j - 1])
        dp[i][j] = dp[i - 1][j - 1] + 1;
      else
        dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}`,
  },
  {
    id: "cpp-l-19",
    title: "Longest Increasing Subsequence",
    language: "C++",
    length: "medium",
    topic: "dp",
    tags: ["optimisation"],
    difficulty: "hard",
    code: `int lis(vector<int>& nums) {
  int n = nums.size();
  if (n == 0) return 0;
  vector<int> dp(n, 1);
  int maxLen = 1;
  for (int i = 1; i < n; i++) {
    for (int j = 0; j < i; j++) {
      if (nums[j] < nums[i]) {
        dp[i] = max(dp[i], dp[j] + 1);
      }
    }
    maxLen = max(maxLen, dp[i]);
  }
  return maxLen;
}`,
  },
  {
    id: "cpp-l-20",
    title: "Edit Distance (DP)",
    language: "C++",
    length: "long",
    topic: "dp",
    tags: ["optimisation"],
    difficulty: "hard",
    code: `int editDistance(string a, string b) {
  int m = a.size(), n = b.size();
  vector<vector<int>> dp(m + 1,
    vector<int>(n + 1, 0));
  for (int i = 0; i <= m; i++) dp[i][0] = i;
  for (int j = 0; j <= n; j++) dp[0][j] = j;
  for (int i = 1; i <= m; i++) {
    for (int j = 1; j <= n; j++) {
      if (a[i - 1] == b[j - 1])
        dp[i][j] = dp[i - 1][j - 1];
      else
        dp[i][j] = 1 + min({dp[i - 1][j],
          dp[i][j - 1], dp[i - 1][j - 1]});
    }
  }
  return dp[m][n];
}`,
  },
  {
    id: "cpp-l-21",
    title: "Coin Change (DP)",
    language: "C++",
    length: "medium",
    topic: "dp",
    tags: ["optimisation"],
    difficulty: "hard",
    code: `int coinChange(vector<int>& coins, int amount) {
  vector<int> dp(amount + 1, amount + 1);
  dp[0] = 0;
  for (int i = 1; i <= amount; i++) {
    for (int coin : coins) {
      if (coin <= i) {
        dp[i] = min(dp[i], dp[i - coin] + 1);
      }
    }
  }
  return dp[amount] > amount ? -1 : dp[amount];
}`,
  },
  {
    id: "cpp-l-22",
    title: "Matrix Chain Multiplication",
    language: "C++",
    length: "long",
    topic: "dp",
    tags: ["optimisation"],
    difficulty: "hard",
    code: `int matrixChainOrder(vector<int>& dims) {
  int n = dims.size() - 1;
  vector<vector<int>> dp(n, vector<int>(n, 0));
  for (int len = 2; len <= n; len++) {
    for (int i = 0; i < n - len + 1; i++) {
      int j = i + len - 1;
      dp[i][j] = INT_MAX;
      for (int k = i; k < j; k++) {
        int cost = dp[i][k] + dp[k + 1][j]
          + dims[i] * dims[k + 1] * dims[j + 1];
        dp[i][j] = min(dp[i][j], cost);
      }
    }
  }
  return dp[0][n - 1];
}`,
  },
  {
    id: "cpp-l-23",
    title: "N-Queens (Backtracking)",
    language: "C++",
    length: "long",
    topic: "recursion",
    tags: ["backtracking"],
    difficulty: "hard",
    code: `bool isSafe(vector<string>& board, int row,
    int col, int n) {
  for (int i = 0; i < row; i++)
    if (board[i][col] == 'Q') return false;
  for (int i = row - 1, j = col - 1;
      i >= 0 && j >= 0; i--, j--)
    if (board[i][j] == 'Q') return false;
  for (int i = row - 1, j = col + 1;
      i >= 0 && j < n; i--, j++)
    if (board[i][j] == 'Q') return false;
  return true;
}

void solve(vector<string>& board, int row, int n,
    vector<vector<string>>& results) {
  if (row == n) { results.push_back(board); return; }
  for (int col = 0; col < n; col++) {
    if (isSafe(board, row, col, n)) {
      board[row][col] = 'Q';
      solve(board, row + 1, n, results);
      board[row][col] = '.';
    }
  }
}`,
  },
  {
    id: "cpp-l-24",
    title: "KMP Pattern Matching",
    language: "C++",
    length: "long",
    topic: "strings",
    tags: ["text"],
    difficulty: "hard",
    code: `vector<int> buildLPS(string pattern) {
  int m = pattern.size();
  vector<int> lps(m, 0);
  int len = 0, i = 1;
  while (i < m) {
    if (pattern[i] == pattern[len]) {
      lps[i++] = ++len;
    } else {
      if (len != 0) len = lps[len - 1];
      else lps[i++] = 0;
    }
  }
  return lps;
}

int kmpSearch(string text, string pattern) {
  vector<int> lps = buildLPS(pattern);
  int n = text.size(), m = pattern.size();
  int i = 0, j = 0;
  while (i < n) {
    if (text[i] == pattern[j]) { i++; j++; }
    if (j == m) return i - j;
    if (i < n && text[i] != pattern[j]) {
      if (j != 0) j = lps[j - 1];
      else i++;
    }
  }
  return -1;
}`,
  },
  {
    id: "cpp-l-25",
    title: "Segment Tree (Range Sum)",
    language: "C++",
    length: "long",
    topic: "trees",
    tags: ["recursion"],
    difficulty: "hard",
    code: `class SegTree {
  vector<int> tree;
  int n;
  void build(int arr[], int node, int s, int e) {
    if (s == e) { tree[node] = arr[s]; return; }
    int mid = (s + e) / 2;
    build(arr, 2 * node, s, mid);
    build(arr, 2 * node + 1, mid + 1, e);
    tree[node] = tree[2 * node] + tree[2 * node + 1];
  }
  int query(int node, int s, int e, int l, int r) {
    if (r < s || e < l) return 0;
    if (l <= s && e <= r) return tree[node];
    int mid = (s + e) / 2;
    return query(2 * node, s, mid, l, r)
      + query(2 * node + 1, mid + 1, e, l, r);
  }
public:
  SegTree(int arr[], int sz) : n(sz), tree(4 * sz) {
    build(arr, 1, 0, n - 1);
  }
  int rangeSum(int l, int r) {
    return query(1, 0, n - 1, l, r);
  }
};`,
  },
  {
    id: "cpp-l-26",
    title: "Fenwick Tree (BIT)",
    language: "C++",
    length: "long",
    topic: "trees",
    tags: ["recursion"],
    difficulty: "hard",
    code: `class FenwickTree {
  vector<int> tree;
  int n;
public:
  FenwickTree(int sz) : n(sz), tree(sz + 1, 0) {}

  void update(int idx, int delta) {
    for (++idx; idx <= n; idx += idx & (-idx))
      tree[idx] += delta;
  }

  int query(int idx) {
    int sum = 0;
    for (++idx; idx > 0; idx -= idx & (-idx))
      sum += tree[idx];
    return sum;
  }

  int rangeQuery(int l, int r) {
    return query(r) - (l > 0 ? query(l - 1) : 0);
  }
};`,
  },
  {
    id: "cpp-l-27",
    title: "AVL Tree Insert",
    language: "C++",
    length: "long",
    topic: "trees",
    tags: ["recursion"],
    difficulty: "hard",
    code: `struct AVLNode {
  int val, height;
  AVLNode *left, *right;
  AVLNode(int x) : val(x), height(1),
    left(nullptr), right(nullptr) {}
};

int getHeight(AVLNode* n) {
  return n ? n->height : 0;
}

int getBalance(AVLNode* n) {
  return n ? getHeight(n->left) - getHeight(n->right) : 0;
}

AVLNode* rotateRight(AVLNode* y) {
  AVLNode* x = y->left;
  y->left = x->right;
  x->right = y;
  y->height = 1 + max(getHeight(y->left), getHeight(y->right));
  x->height = 1 + max(getHeight(x->left), getHeight(x->right));
  return x;
}

AVLNode* rotateLeft(AVLNode* x) {
  AVLNode* y = x->right;
  x->right = y->left;
  y->left = x;
  x->height = 1 + max(getHeight(x->left), getHeight(x->right));
  y->height = 1 + max(getHeight(y->left), getHeight(y->right));
  return y;
}`,
  },
  {
    id: "cpp-l-28",
    title: "Min Heap Class",
    language: "C++",
    length: "long",
    topic: "heap",
    tags: ["data-structures"],
    difficulty: "hard",
    code: `class MinHeap {
  vector<int> heap;
  void siftUp(int i) {
    while (i > 0) {
      int parent = (i - 1) / 2;
      if (heap[parent] > heap[i]) {
        swap(heap[parent], heap[i]);
        i = parent;
      } else break;
    }
  }
  void siftDown(int i) {
    int n = heap.size();
    while (2 * i + 1 < n) {
      int child = 2 * i + 1;
      if (child + 1 < n && heap[child + 1] < heap[child])
        child++;
      if (heap[i] > heap[child]) {
        swap(heap[i], heap[child]);
        i = child;
      } else break;
    }
  }
public:
  void push(int val) { heap.push_back(val); siftUp(heap.size() - 1); }
  int top() { return heap[0]; }
  void pop() { heap[0] = heap.back(); heap.pop_back(); siftDown(0); }
  bool empty() { return heap.empty(); }
};`,
  },
  {
    id: "cpp-l-29",
    title: "Graph Coloring (Backtracking)",
    language: "C++",
    length: "long",
    topic: "graphs",
    tags: ["traversal"],
    difficulty: "hard",
    code: `bool isSafeColor(vector<vector<int>>& adj,
    vector<int>& color, int node, int c) {
  for (int neighbor : adj[node]) {
    if (color[neighbor] == c) return false;
  }
  return true;
}

bool graphColor(vector<vector<int>>& adj,
    vector<int>& color, int node, int V, int m) {
  if (node == V) return true;
  for (int c = 1; c <= m; c++) {
    if (isSafeColor(adj, color, node, c)) {
      color[node] = c;
      if (graphColor(adj, color, node + 1, V, m))
        return true;
      color[node] = 0;
    }
  }
  return false;
}`,
  },
  {
    id: "cpp-l-30",
    title: "String Permutations",
    language: "C++",
    length: "long",
    topic: "recursion",
    tags: ["backtracking"],
    difficulty: "hard",
    code: `void permute(string& s, int left, int right,
    vector<string>& result) {
  if (left == right) {
    result.push_back(s);
    return;
  }
  for (int i = left; i <= right; i++) {
    swap(s[left], s[i]);
    permute(s, left + 1, right, result);
    swap(s[left], s[i]);
  }
}

vector<string> getAllPermutations(string s) {
  vector<string> result;
  permute(s, 0, s.size() - 1, result);
  return result;
}`,
  },
  {
    id: "cpp-l-31",
    title: "Linked List Merge Sort",
    language: "C++",
    length: "long",
    topic: "linked-list",
    tags: ["sorting", "recursion"],
    difficulty: "hard",
    code: `ListNode* getMid(ListNode* head) {
  ListNode* slow = head;
  ListNode* fast = head->next;
  while (fast && fast->next) {
    slow = slow->next;
    fast = fast->next->next;
  }
  return slow;
}

ListNode* mergeLists(ListNode* a, ListNode* b) {
  if (!a) return b;
  if (!b) return a;
  if (a->val <= b->val) {
    a->next = mergeLists(a->next, b);
    return a;
  }
  b->next = mergeLists(a, b->next);
  return b;
}

ListNode* mergeSort(ListNode* head) {
  if (!head || !head->next) return head;
  ListNode* mid = getMid(head);
  ListNode* right = mid->next;
  mid->next = nullptr;
  return mergeLists(mergeSort(head), mergeSort(right));
}`,
  },
  {
    id: "cpp-l-32",
    title: "Doubly Linked List",
    language: "C++",
    length: "long",
    topic: "linked-list",
    tags: ["pointers"],
    difficulty: "hard",
    code: `struct DLLNode {
  int val;
  DLLNode *prev, *next;
  DLLNode(int x) : val(x), prev(nullptr), next(nullptr) {}
};

class DoublyLinkedList {
  DLLNode *head, *tail;
public:
  DoublyLinkedList() : head(nullptr), tail(nullptr) {}

  void pushFront(int val) {
    DLLNode* node = new DLLNode(val);
    node->next = head;
    if (head) head->prev = node;
    head = node;
    if (!tail) tail = node;
  }

  void pushBack(int val) {
    DLLNode* node = new DLLNode(val);
    node->prev = tail;
    if (tail) tail->next = node;
    tail = node;
    if (!head) head = node;
  }

  void popFront() {
    if (!head) return;
    DLLNode* temp = head;
    head = head->next;
    if (head) head->prev = nullptr;
    else tail = nullptr;
    delete temp;
  }
};`,
  },
  {
    id: "cpp-l-33",
    title: "Union-Find (DSU)",
    language: "C++",
    length: "long",
    topic: "graphs",
    tags: ["traversal"],
    difficulty: "hard",
    code: `class UnionFind {
  vector<int> parent, rank;
public:
  UnionFind(int n) : parent(n), rank(n, 0) {
    for (int i = 0; i < n; i++) parent[i] = i;
  }

  int find(int x) {
    if (parent[x] != x)
      parent[x] = find(parent[x]);
    return parent[x];
  }

  bool unite(int x, int y) {
    int px = find(x), py = find(y);
    if (px == py) return false;
    if (rank[px] < rank[py]) swap(px, py);
    parent[py] = px;
    if (rank[px] == rank[py]) rank[px]++;
    return true;
  }

  bool connected(int x, int y) {
    return find(x) == find(y);
  }
};`,
  },

  /* ═══════════════════════════════════════════════════════════
     Python — SHORT  (33 snippets, 1–5 lines)
     ═══════════════════════════════════════════════════════════ */

  {
    id: "py-s-1",
    title: "Swap Variables",
    language: "Python",
    length: "short",
    topic: "basics",
    tags: ["fundamentals"],
    difficulty: "easy",
    code: `def swap(a, b):
    a, b = b, a
    return a, b`,
  },
  {
    id: "py-s-2",
    title: "Max of Two",
    language: "Python",
    length: "short",
    topic: "basics",
    tags: ["fundamentals"],
    difficulty: "easy",
    code: `def max_of_two(a, b):
    return a if a > b else b`,
  },
  {
    id: "py-s-3",
    title: "Min of Two",
    language: "Python",
    length: "short",
    topic: "basics",
    tags: ["fundamentals"],
    difficulty: "easy",
    code: `def min_of_two(a, b):
    return a if a < b else b`,
  },
  {
    id: "py-s-4",
    title: "Is Even",
    language: "Python",
    length: "short",
    topic: "basics",
    tags: ["fundamentals"],
    difficulty: "easy",
    code: `def is_even(n):
    return n % 2 == 0`,
  },
  {
    id: "py-s-5",
    title: "Absolute Value",
    language: "Python",
    length: "short",
    topic: "basics",
    tags: ["fundamentals"],
    difficulty: "easy",
    code: `def abs_val(n):
    return -n if n < 0 else n`,
  },
  {
    id: "py-s-6",
    title: "Celsius to Fahrenheit",
    language: "Python",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `def to_fahrenheit(celsius):
    return celsius * 9.0 / 5.0 + 32.0`,
  },
  {
    id: "py-s-7",
    title: "Area of Circle",
    language: "Python",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `import math

def circle_area(radius):
    return math.pi * radius ** 2`,
  },
  {
    id: "py-s-8",
    title: "Recursive Factorial",
    language: "Python",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)`,
  },
  {
    id: "py-s-9",
    title: "Is Power of Two",
    language: "Python",
    length: "short",
    topic: "bits",
    tags: ["binary"],
    difficulty: "easy",
    code: `def is_power_of_two(n):
    return n > 0 and (n & (n - 1)) == 0`,
  },
  {
    id: "py-s-10",
    title: "Count Digits",
    language: "Python",
    length: "medium",
    topic: "math",
    tags: ["numbers"],
    difficulty: "medium",
    code: `def count_digits(n):
    count = 0
    while n != 0:
        count += 1
        n //= 10
    return count`,
  },
  {
    id: "py-s-11",
    title: "Sum of Digits",
    language: "Python",
    length: "medium",
    topic: "math",
    tags: ["numbers"],
    difficulty: "medium",
    code: `def sum_digits(n):
    total = 0
    while n > 0:
        total += n % 10
        n //= 10
    return total`,
  },
  {
    id: "py-s-12",
    title: "GCD (Euclidean)",
    language: "Python",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `def gcd(a, b):
    while b != 0:
        a, b = b, a % b
    return a`,
  },
  {
    id: "py-s-13",
    title: "LCM via GCD",
    language: "Python",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `def lcm(a, b):
    return a * b // gcd(a, b)`,
  },
  {
    id: "py-s-14",
    title: "Clamp Value",
    language: "Python",
    length: "short",
    topic: "basics",
    tags: ["fundamentals"],
    difficulty: "easy",
    code: `def clamp(val, lo, hi):
    return max(lo, min(val, hi))`,
  },
  {
    id: "py-s-15",
    title: "Is Palindrome String",
    language: "Python",
    length: "short",
    topic: "strings",
    tags: ["text"],
    difficulty: "easy",
    code: `def is_palindrome(s):
    return s == s[::-1]`,
  },
  {
    id: "py-s-16",
    title: "List Comprehension Squares",
    language: "Python",
    length: "short",
    topic: "functional",
    tags: ["idioms"],
    difficulty: "easy",
    code: `def squares(n):
    return [x ** 2 for x in range(1, n + 1)]`,
  },
  {
    id: "py-s-17",
    title: "Filter Even Numbers",
    language: "Python",
    length: "short",
    topic: "functional",
    tags: ["idioms"],
    difficulty: "easy",
    code: `def filter_evens(nums):
    return list(filter(lambda x: x % 2 == 0, nums))`,
  },
  {
    id: "py-s-18",
    title: "Flatten Nested List",
    language: "Python",
    length: "short",
    topic: "arrays",
    tags: ["indexing"],
    difficulty: "easy",
    code: `def flatten(lst):
    return [x for sub in lst for x in sub]`,
  },
  {
    id: "py-s-19",
    title: "Reverse String",
    language: "Python",
    length: "short",
    topic: "strings",
    tags: ["text"],
    difficulty: "easy",
    code: `def reverse_string(s):
    return s[::-1]`,
  },
  {
    id: "py-s-20",
    title: "Is Anagram",
    language: "Python",
    length: "short",
    topic: "hashing",
    tags: ["counting"],
    difficulty: "easy",
    code: `def is_anagram(s, t):
    return sorted(s) == sorted(t)`,
  },
  {
    id: "py-s-21",
    title: "Count Vowels",
    language: "Python",
    length: "short",
    topic: "strings",
    tags: ["text"],
    difficulty: "easy",
    code: `def count_vowels(s):
    return sum(1 for c in s if c in "aeiouAEIOU")`,
  },
  {
    id: "py-s-22",
    title: "Dictionary Comprehension",
    language: "Python",
    length: "short",
    topic: "functional",
    tags: ["idioms"],
    difficulty: "easy",
    code: `def square_dict(n):
    return {x: x ** 2 for x in range(1, n + 1)}`,
  },
  {
    id: "py-s-23",
    title: "Set Intersection",
    language: "Python",
    length: "short",
    topic: "hashing",
    tags: ["counting"],
    difficulty: "easy",
    code: `def common_elements(a, b):
    return list(set(a) & set(b))`,
  },
  {
    id: "py-s-24",
    title: "Zip Two Lists",
    language: "Python",
    length: "short",
    topic: "functional",
    tags: ["idioms"],
    difficulty: "easy",
    code: `def zip_lists(a, b):
    return list(zip(a, b))`,
  },
  {
    id: "py-s-25",
    title: "Enumerate Usage",
    language: "Python",
    length: "short",
    topic: "functional",
    tags: ["idioms"],
    difficulty: "easy",
    code: `def indexed(items):
    return [(i, v) for i, v in enumerate(items)]`,
  },
  {
    id: "py-s-26",
    title: "Max of Three",
    language: "Python",
    length: "short",
    topic: "basics",
    tags: ["fundamentals"],
    difficulty: "easy",
    code: `def max_of_three(a, b, c):
    return max(a, max(b, c))`,
  },
  {
    id: "py-s-27",
    title: "Is Leap Year",
    language: "Python",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `def is_leap_year(y):
    return (y % 4 == 0 and y % 100 != 0) or (y % 400 == 0)`,
  },
  {
    id: "py-s-28",
    title: "Linear Search",
    language: "Python",
    length: "short",
    topic: "searching",
    tags: ["arrays"],
    difficulty: "easy",
    code: `def linear_search(arr, key):
    for i in range(len(arr)):
        if arr[i] == key:
            return i
    return -1`,
  },
  {
    id: "py-s-29",
    title: "Fibonacci Recursive",
    language: "Python",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)`,
  },
  {
    id: "py-s-30",
    title: "Map Function Usage",
    language: "Python",
    length: "short",
    topic: "functional",
    tags: ["idioms"],
    difficulty: "easy",
    code: `def double_all(nums):
    return list(map(lambda x: x * 2, nums))`,
  },
  {
    id: "py-s-31",
    title: "Sum of List",
    language: "Python",
    length: "short",
    topic: "arrays",
    tags: ["indexing"],
    difficulty: "easy",
    code: `def list_sum(arr):
    total = 0
    for num in arr:
        total += num
    return total`,
  },
  {
    id: "py-s-32",
    title: "Remove Duplicates from List",
    language: "Python",
    length: "short",
    topic: "arrays",
    tags: ["indexing"],
    difficulty: "easy",
    code: `def remove_dupes(arr):
    return list(dict.fromkeys(arr))`,
  },
  {
    id: "py-s-33",
    title: "Reverse Number",
    language: "Python",
    length: "medium",
    topic: "math",
    tags: ["numbers"],
    difficulty: "medium",
    code: `def reverse_num(n):
    rev = 0
    while n > 0:
        rev = rev * 10 + n % 10
        n //= 10
    return rev`,
  },

  /* ═══════════════════════════════════════════════════════════
     Python — MEDIUM  (34 snippets, 6–15 lines)
     ═══════════════════════════════════════════════════════════ */

  {
    id: "py-m-1",
    title: "Binary Search",
    language: "Python",
    length: "medium",
    topic: "searching",
    tags: ["arrays"],
    difficulty: "medium",
    code: `def binary_search(arr, target):
    low, high = 0, len(arr) - 1
    while low <= high:
        mid = low + (high - low) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1`,
  },
  {
    id: "py-m-2",
    title: "Bubble Sort",
    language: "Python",
    length: "medium",
    topic: "sorting",
    tags: ["arrays"],
    difficulty: "medium",
    code: `def bubble_sort(arr):
    n = len(arr)
    for i in range(n - 1):
        swapped = False
        for j in range(n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
        if not swapped:
            break
    return arr`,
  },
  {
    id: "py-m-3",
    title: "Selection Sort",
    language: "Python",
    length: "medium",
    topic: "sorting",
    tags: ["arrays"],
    difficulty: "medium",
    code: `def selection_sort(arr):
    n = len(arr)
    for i in range(n - 1):
        min_idx = i
        for j in range(i + 1, n):
            if arr[j] < arr[min_idx]:
                min_idx = j
        arr[i], arr[min_idx] = arr[min_idx], arr[i]
    return arr`,
  },
  {
    id: "py-m-4",
    title: "Insertion Sort",
    language: "Python",
    length: "medium",
    topic: "sorting",
    tags: ["arrays"],
    difficulty: "medium",
    code: `def insertion_sort(arr):
    for i in range(1, len(arr)):
        key = arr[i]
        j = i - 1
        while j >= 0 and arr[j] > key:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key
    return arr`,
  },
  {
    id: "py-m-5",
    title: "Reverse Linked List",
    language: "Python",
    length: "medium",
    topic: "linked-list",
    tags: ["pointers"],
    difficulty: "medium",
    code: `def reverse_list(head):
    prev = None
    curr = head
    while curr is not None:
        next_node = curr.next
        curr.next = prev
        prev = curr
        curr = next_node
    return prev`,
  },
  {
    id: "py-m-6",
    title: "Two Sum (Dictionary)",
    language: "Python",
    length: "medium",
    topic: "hashing",
    tags: ["arrays"],
    difficulty: "medium",
    code: `def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []`,
  },
  {
    id: "py-m-7",
    title: "Palindrome Number",
    language: "Python",
    length: "medium",
    topic: "math",
    tags: ["numbers"],
    difficulty: "medium",
    code: `def is_palindrome(n):
    if n < 0:
        return False
    original = n
    rev = 0
    while n > 0:
        rev = rev * 10 + n % 10
        n //= 10
    return original == rev`,
  },
  {
    id: "py-m-8",
    title: "Count Occurrences",
    language: "Python",
    length: "medium",
    topic: "hashing",
    tags: ["counting"],
    difficulty: "medium",
    code: `def count_occurrences(arr, target):
    count = 0
    for item in arr:
        if item == target:
            count += 1
    return count`,
  },
  {
    id: "py-m-9",
    title: "Remove Duplicates (Sorted)",
    language: "Python",
    length: "medium",
    topic: "arrays",
    tags: ["indexing"],
    difficulty: "medium",
    code: `def remove_duplicates(arr):
    if not arr:
        return []
    result = [arr[0]]
    for i in range(1, len(arr)):
        if arr[i] != arr[i - 1]:
            result.append(arr[i])
    return result`,
  },
  {
    id: "py-m-10",
    title: "Kadane's Max Subarray",
    language: "Python",
    length: "medium",
    topic: "dp",
    tags: ["optimisation"],
    difficulty: "hard",
    code: `def max_subarray_sum(nums):
    max_sum = nums[0]
    curr_sum = nums[0]
    for i in range(1, len(nums)):
        curr_sum = max(nums[i], curr_sum + nums[i])
        max_sum = max(max_sum, curr_sum)
    return max_sum`,
  },
  {
    id: "py-m-11",
    title: "Rotate Array",
    language: "Python",
    length: "medium",
    topic: "arrays",
    tags: ["indexing"],
    difficulty: "medium",
    code: `def rotate_left(arr, k):
    n = len(arr)
    k = k % n
    arr[:k] = arr[:k][::-1]
    arr[k:] = arr[k:][::-1]
    arr[:] = arr[:][::-1]
    return arr`,
  },
  {
    id: "py-m-12",
    title: "Matrix Transpose",
    language: "Python",
    length: "medium",
    topic: "matrix",
    tags: ["arrays"],
    difficulty: "medium",
    code: `def transpose(matrix):
    rows = len(matrix)
    cols = len(matrix[0])
    result = []
    for j in range(cols):
        row = []
        for i in range(rows):
            row.append(matrix[i][j])
        result.append(row)
    return result`,
  },
  {
    id: "py-m-13",
    title: "Fast Exponentiation",
    language: "Python",
    length: "medium",
    topic: "math",
    tags: ["numbers"],
    difficulty: "medium",
    code: `def power(base, exp, mod):
    result = 1
    base %= mod
    while exp > 0:
        if exp % 2 == 1:
            result = result * base % mod
        base = base * base % mod
        exp //= 2
    return result`,
  },
  {
    id: "py-m-14",
    title: "Check Anagram",
    language: "Python",
    length: "medium",
    topic: "hashing",
    tags: ["counting"],
    difficulty: "medium",
    code: `def is_anagram(s, t):
    if len(s) != len(t):
        return False
    freq = {}
    for c in s:
        freq[c] = freq.get(c, 0) + 1
    for c in t:
        freq[c] = freq.get(c, 0) - 1
        if freq[c] < 0:
            return False
    return True`,
  },
  {
    id: "py-m-15",
    title: "Valid Parentheses",
    language: "Python",
    length: "medium",
    topic: "stack-queue",
    tags: ["data-structures"],
    difficulty: "medium",
    code: `def is_valid(s):
    stack = []
    pairs = {')': '(', '}': '{', ']': '['}
    for c in s:
        if c in '({[':
            stack.append(c)
        else:
            if not stack or stack[-1] != pairs[c]:
                return False
            stack.pop()
    return len(stack) == 0`,
  },
  {
    id: "py-m-16",
    title: "Find Middle of Linked List",
    language: "Python",
    length: "medium",
    topic: "linked-list",
    tags: ["pointers"],
    difficulty: "medium",
    code: `def find_middle(head):
    slow = head
    fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow`,
  },
  {
    id: "py-m-17",
    title: "Merge Two Sorted Lists",
    language: "Python",
    length: "medium",
    topic: "arrays",
    tags: ["indexing"],
    difficulty: "medium",
    code: `def merge_sorted(a, b):
    result = []
    i = j = 0
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            result.append(a[i])
            i += 1
        else:
            result.append(b[j])
            j += 1
    result.extend(a[i:])
    result.extend(b[j:])
    return result`,
  },
  {
    id: "py-m-18",
    title: "Count Set Bits",
    language: "Python",
    length: "medium",
    topic: "bits",
    tags: ["binary"],
    difficulty: "medium",
    code: `def count_set_bits(n):
    count = 0
    while n > 0:
        count += n & 1
        n >>= 1
    return count`,
  },
  {
    id: "py-m-19",
    title: "Sliding Window Max Sum",
    language: "Python",
    length: "medium",
    topic: "arrays",
    tags: ["indexing"],
    difficulty: "medium",
    code: `def max_sum_window(arr, k):
    window_sum = sum(arr[:k])
    max_sum = window_sum
    for i in range(k, len(arr)):
        window_sum += arr[i] - arr[i - k]
        max_sum = max(max_sum, window_sum)
    return max_sum`,
  },
  {
    id: "py-m-20",
    title: "Two Pointer Pair Sum",
    language: "Python",
    length: "medium",
    topic: "arrays",
    tags: ["indexing"],
    difficulty: "medium",
    code: `def pair_sum(arr, target):
    left, right = 0, len(arr) - 1
    while left < right:
        s = arr[left] + arr[right]
        if s == target:
            return (left, right)
        elif s < target:
            left += 1
        else:
            right -= 1
    return (-1, -1)`,
  },
  {
    id: "py-m-21",
    title: "Stack Implementation",
    language: "Python",
    length: "medium",
    topic: "stack-queue",
    tags: ["data-structures"],
    difficulty: "medium",
    code: `class Stack:
    def __init__(self):
        self.items = []

    def push(self, val):
        self.items.append(val)

    def pop(self):
        return self.items.pop()

    def peek(self):
        return self.items[-1]

    def is_empty(self):
        return len(self.items) == 0`,
  },
  {
    id: "py-m-22",
    title: "Queue Implementation",
    language: "Python",
    length: "long",
    topic: "stack-queue",
    tags: ["data-structures"],
    difficulty: "hard",
    code: `from collections import deque

class Queue:
    def __init__(self):
        self.items = deque()

    def enqueue(self, val):
        self.items.append(val)

    def dequeue(self):
        return self.items.popleft()

    def peek(self):
        return self.items[0]

    def is_empty(self):
        return len(self.items) == 0`,
  },
  {
    id: "py-m-23",
    title: "Sieve of Eratosthenes",
    language: "Python",
    length: "medium",
    topic: "math",
    tags: ["numbers"],
    difficulty: "medium",
    code: `def sieve(n):
    is_prime = [True] * (n + 1)
    is_prime[0] = is_prime[1] = False
    i = 2
    while i * i <= n:
        if is_prime[i]:
            for j in range(i * i, n + 1, i):
                is_prime[j] = False
        i += 1
    return [x for x in range(2, n + 1) if is_prime[x]]`,
  },
  {
    id: "py-m-24",
    title: "Generator Function (Fibonacci)",
    language: "Python",
    length: "medium",
    topic: "functional",
    tags: ["idioms"],
    difficulty: "medium",
    code: `def fib_generator(limit):
    a, b = 0, 1
    count = 0
    while count < limit:
        yield a
        a, b = b, a + b
        count += 1`,
  },
  {
    id: "py-m-25",
    title: "Decorator Function (Timer)",
    language: "Python",
    length: "medium",
    topic: "oop",
    tags: ["patterns"],
    difficulty: "medium",
    code: `import time

def timer(func):
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        elapsed = time.time() - start
        print(f"{func.__name__} took {elapsed:.4f}s")
        return result
    return wrapper`,
  },
  {
    id: "py-m-26",
    title: "Context Manager Class",
    language: "Python",
    length: "medium",
    topic: "oop",
    tags: ["patterns"],
    difficulty: "medium",
    code: `class FileHandler:
    def __init__(self, filename, mode):
        self.filename = filename
        self.mode = mode
        self.file = None

    def __enter__(self):
        self.file = open(self.filename, self.mode)
        return self.file

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.file:
            self.file.close()
        return False`,
  },
  {
    id: "py-m-27",
    title: "Nested List Comprehension (Matrix)",
    language: "Python",
    length: "short",
    topic: "functional",
    tags: ["idioms"],
    difficulty: "easy",
    code: `def identity_matrix(n):
    return [
        [1 if i == j else 0 for j in range(n)]
        for i in range(n)
    ]`,
  },
  {
    id: "py-m-28",
    title: "Binary Tree Height",
    language: "Python",
    length: "medium",
    topic: "trees",
    tags: ["recursion"],
    difficulty: "hard",
    code: `def height(root):
    if root is None:
        return 0
    left_h = height(root.left)
    right_h = height(root.right)
    return 1 + max(left_h, right_h)`,
  },
  {
    id: "py-m-29",
    title: "Level Order Traversal",
    language: "Python",
    length: "medium",
    topic: "trees",
    tags: ["recursion"],
    difficulty: "hard",
    code: `from collections import deque

def level_order(root):
    if not root:
        return []
    result = []
    queue = deque([root])
    while queue:
        node = queue.popleft()
        result.append(node.val)
        if node.left:
            queue.append(node.left)
        if node.right:
            queue.append(node.right)
    return result`,
  },
  {
    id: "py-m-30",
    title: "Next Greater Element",
    language: "Python",
    length: "medium",
    topic: "stack-queue",
    tags: ["data-structures"],
    difficulty: "medium",
    code: `def next_greater(arr):
    n = len(arr)
    result = [-1] * n
    stack = []
    for i in range(n):
        while stack and arr[stack[-1]] < arr[i]:
            result[stack.pop()] = arr[i]
        stack.append(i)
    return result`,
  },
  {
    id: "py-m-31",
    title: "Detect Cycle in Linked List",
    language: "Python",
    length: "medium",
    topic: "linked-list",
    tags: ["pointers"],
    difficulty: "medium",
    code: `def has_cycle(head):
    slow = head
    fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow == fast:
            return True
    return False`,
  },
  {
    id: "py-m-32",
    title: "Dutch National Flag",
    language: "Python",
    length: "medium",
    topic: "sorting",
    tags: ["arrays"],
    difficulty: "medium",
    code: `def sort_colors(nums):
    lo, mid, hi = 0, 0, len(nums) - 1
    while mid <= hi:
        if nums[mid] == 0:
            nums[lo], nums[mid] = nums[mid], nums[lo]
            lo += 1
            mid += 1
        elif nums[mid] == 1:
            mid += 1
        else:
            nums[mid], nums[hi] = nums[hi], nums[mid]
            hi -= 1
    return nums`,
  },
  {
    id: "py-m-33",
    title: "Power Set (Iterative)",
    language: "Python",
    length: "medium",
    topic: "recursion",
    tags: ["backtracking"],
    difficulty: "medium",
    code: `def power_set(nums):
    n = len(nums)
    result = []
    for mask in range(1 << n):
        subset = []
        for i in range(n):
            if mask & (1 << i):
                subset.append(nums[i])
        result.append(subset)
    return result`,
  },
  {
    id: "py-m-34",
    title: "Inorder Traversal",
    language: "Python",
    length: "medium",
    topic: "trees",
    tags: ["recursion"],
    difficulty: "hard",
    code: `def inorder(root):
    result = []
    stack = []
    curr = root
    while curr or stack:
        while curr:
            stack.append(curr)
            curr = curr.left
        curr = stack.pop()
        result.append(curr.val)
        curr = curr.right
    return result`,
  },

  /* ═══════════════════════════════════════════════════════════
     Python — LONG  (33 snippets, 16+ lines)
     ═══════════════════════════════════════════════════════════ */

  {
    id: "py-l-1",
    title: "Merge Sort",
    language: "Python",
    length: "long",
    topic: "sorting",
    tags: ["arrays"],
    difficulty: "hard",
    code: `def merge(arr, left, mid, right):
    L = arr[left:mid + 1]
    R = arr[mid + 1:right + 1]
    i = j = 0
    k = left
    while i < len(L) and j < len(R):
        if L[i] <= R[j]:
            arr[k] = L[i]
            i += 1
        else:
            arr[k] = R[j]
            j += 1
        k += 1
    while i < len(L):
        arr[k] = L[i]
        i += 1
        k += 1
    while j < len(R):
        arr[k] = R[j]
        j += 1
        k += 1

def merge_sort(arr, left, right):
    if left < right:
        mid = (left + right) // 2
        merge_sort(arr, left, mid)
        merge_sort(arr, mid + 1, right)
        merge(arr, left, mid, right)`,
  },
  {
    id: "py-l-2",
    title: "Quick Sort",
    language: "Python",
    length: "medium",
    topic: "sorting",
    tags: ["arrays"],
    difficulty: "medium",
    code: `def partition(arr, low, high):
    pivot = arr[high]
    i = low - 1
    for j in range(low, high):
        if arr[j] < pivot:
            i += 1
            arr[i], arr[j] = arr[j], arr[i]
    arr[i + 1], arr[high] = arr[high], arr[i + 1]
    return i + 1

def quick_sort(arr, low, high):
    if low < high:
        pi = partition(arr, low, high)
        quick_sort(arr, low, pi - 1)
        quick_sort(arr, pi + 1, high)`,
  },
  {
    id: "py-l-3",
    title: "Heap Sort",
    language: "Python",
    length: "long",
    topic: "sorting",
    tags: ["heap"],
    difficulty: "hard",
    code: `def heapify(arr, n, i):
    largest = i
    left = 2 * i + 1
    right = 2 * i + 2
    if left < n and arr[left] > arr[largest]:
        largest = left
    if right < n and arr[right] > arr[largest]:
        largest = right
    if largest != i:
        arr[i], arr[largest] = arr[largest], arr[i]
        heapify(arr, n, largest)

def heap_sort(arr):
    n = len(arr)
    for i in range(n // 2 - 1, -1, -1):
        heapify(arr, n, i)
    for i in range(n - 1, 0, -1):
        arr[0], arr[i] = arr[i], arr[0]
        heapify(arr, i, 0)
    return arr`,
  },
  {
    id: "py-l-4",
    title: "Counting Sort",
    language: "Python",
    length: "long",
    topic: "sorting",
    tags: ["arrays"],
    difficulty: "hard",
    code: `def counting_sort(arr):
    if not arr:
        return arr
    max_val = max(arr)
    min_val = min(arr)
    range_val = max_val - min_val + 1
    count = [0] * range_val
    output = [0] * len(arr)
    for num in arr:
        count[num - min_val] += 1
    for i in range(1, range_val):
        count[i] += count[i - 1]
    for i in range(len(arr) - 1, -1, -1):
        output[count[arr[i] - min_val] - 1] = arr[i]
        count[arr[i] - min_val] -= 1
    return output`,
  },
  {
    id: "py-l-5",
    title: "Dijkstra's Algorithm",
    language: "Python",
    length: "medium",
    topic: "graphs",
    tags: ["traversal"],
    difficulty: "hard",
    code: `import heapq

def dijkstra(src, V, adj):
    dist = [float('inf')] * V
    dist[src] = 0
    pq = [(0, src)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:
            continue
        for v, w in adj[u]:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                heapq.heappush(pq, (dist[v], v))
    return dist`,
  },
  {
    id: "py-l-6",
    title: "BFS Graph Traversal",
    language: "Python",
    length: "medium",
    topic: "graphs",
    tags: ["traversal"],
    difficulty: "hard",
    code: `from collections import deque

def bfs(start, V, adj):
    visited = [False] * V
    queue = deque([start])
    visited[start] = True
    result = []
    while queue:
        node = queue.popleft()
        result.append(node)
        for neighbor in adj[node]:
            if not visited[neighbor]:
                visited[neighbor] = True
                queue.append(neighbor)
    return result`,
  },
  {
    id: "py-l-7",
    title: "DFS Graph Traversal",
    language: "Python",
    length: "medium",
    topic: "graphs",
    tags: ["traversal"],
    difficulty: "hard",
    code: `def dfs(node, adj, visited, result):
    visited[node] = True
    result.append(node)
    for neighbor in adj[node]:
        if not visited[neighbor]:
            dfs(neighbor, adj, visited, result)

def traverse_graph(V, adj):
    visited = [False] * V
    result = []
    for i in range(V):
        if not visited[i]:
            dfs(i, adj, visited, result)
    return result`,
  },
  {
    id: "py-l-8",
    title: "Topological Sort (DFS)",
    language: "Python",
    length: "medium",
    topic: "graphs",
    tags: ["traversal"],
    difficulty: "hard",
    code: `def topo_helper(node, adj, visited, stack):
    visited[node] = True
    for neighbor in adj[node]:
        if not visited[neighbor]:
            topo_helper(neighbor, adj, visited, stack)
    stack.append(node)

def topological_sort(V, adj):
    visited = [False] * V
    stack = []
    for i in range(V):
        if not visited[i]:
            topo_helper(i, adj, visited, stack)
    stack.reverse()
    return stack`,
  },
  {
    id: "py-l-9",
    title: "Bellman-Ford Algorithm",
    language: "Python",
    length: "medium",
    topic: "graphs",
    tags: ["traversal"],
    difficulty: "hard",
    code: `def bellman_ford(src, V, edges):
    dist = [float('inf')] * V
    dist[src] = 0
    for _ in range(V - 1):
        for u, v, w in edges:
            if dist[u] != float('inf') and dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
    for u, v, w in edges:
        if dist[u] != float('inf') and dist[u] + w < dist[v]:
            return None
    return dist`,
  },
  {
    id: "py-l-10",
    title: "BST Class (Insert & Search)",
    language: "Python",
    length: "long",
    topic: "trees",
    tags: ["recursion"],
    difficulty: "hard",
    code: `class BSTNode:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

class BST:
    def __init__(self):
        self.root = None

    def insert(self, val):
        self.root = self._insert(self.root, val)

    def _insert(self, node, val):
        if node is None:
            return BSTNode(val)
        if val < node.val:
            node.left = self._insert(node.left, val)
        else:
            node.right = self._insert(node.right, val)
        return node

    def search(self, val):
        return self._search(self.root, val)

    def _search(self, node, val):
        if node is None:
            return False
        if node.val == val:
            return True
        if val < node.val:
            return self._search(node.left, val)
        return self._search(node.right, val)`,
  },
  {
    id: "py-l-11",
    title: "Trie Class (Insert & Search)",
    language: "Python",
    length: "long",
    topic: "trees",
    tags: ["recursion"],
    difficulty: "hard",
    code: `class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for char in word:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        node.is_end = True

    def search(self, word):
        node = self.root
        for char in word:
            if char not in node.children:
                return False
            node = node.children[char]
        return node.is_end

    def starts_with(self, prefix):
        node = self.root
        for char in prefix:
            if char not in node.children:
                return False
            node = node.children[char]
        return True`,
  },
  {
    id: "py-l-12",
    title: "LRU Cache (OrderedDict)",
    language: "Python",
    length: "long",
    topic: "hashing",
    tags: ["counting"],
    difficulty: "hard",
    code: `from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.cache = OrderedDict()

    def get(self, key):
        if key not in self.cache:
            return -1
        self.cache.move_to_end(key)
        return self.cache[key]

    def put(self, key, value):
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)`,
  },
  {
    id: "py-l-13",
    title: "0/1 Knapsack (DP)",
    language: "Python",
    length: "medium",
    topic: "dp",
    tags: ["optimisation"],
    difficulty: "hard",
    code: `def knapsack(W, weights, values, n):
    dp = [[0] * (W + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for w in range(W + 1):
            dp[i][w] = dp[i - 1][w]
            if weights[i - 1] <= w:
                dp[i][w] = max(
                    dp[i][w],
                    dp[i - 1][w - weights[i - 1]] + values[i - 1]
                )
    return dp[n][W]`,
  },
  {
    id: "py-l-14",
    title: "Longest Common Subsequence",
    language: "Python",
    length: "medium",
    topic: "dp",
    tags: ["optimisation"],
    difficulty: "hard",
    code: `def lcs(a, b):
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[m][n]`,
  },
  {
    id: "py-l-15",
    title: "Longest Increasing Subsequence",
    language: "Python",
    length: "medium",
    topic: "dp",
    tags: ["optimisation"],
    difficulty: "hard",
    code: `def lis(nums):
    n = len(nums)
    if n == 0:
        return 0
    dp = [1] * n
    max_len = 1
    for i in range(1, n):
        for j in range(i):
            if nums[j] < nums[i]:
                dp[i] = max(dp[i], dp[j] + 1)
        max_len = max(max_len, dp[i])
    return max_len`,
  },
  {
    id: "py-l-16",
    title: "Edit Distance (DP)",
    language: "Python",
    length: "long",
    topic: "dp",
    tags: ["optimisation"],
    difficulty: "hard",
    code: `def edit_distance(a, b):
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(
                    dp[i - 1][j],
                    dp[i][j - 1],
                    dp[i - 1][j - 1]
                )
    return dp[m][n]`,
  },
  {
    id: "py-l-17",
    title: "Coin Change (DP)",
    language: "Python",
    length: "medium",
    topic: "dp",
    tags: ["optimisation"],
    difficulty: "hard",
    code: `def coin_change(coins, amount):
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0
    for i in range(1, amount + 1):
        for coin in coins:
            if coin <= i:
                dp[i] = min(dp[i], dp[i - coin] + 1)
    return dp[amount] if dp[amount] != float('inf') else -1`,
  },
  {
    id: "py-l-18",
    title: "N-Queens (Backtracking)",
    language: "Python",
    length: "long",
    topic: "recursion",
    tags: ["backtracking"],
    difficulty: "hard",
    code: `def solve_n_queens(n):
    results = []
    board = [['.' for _ in range(n)] for _ in range(n)]

    def is_safe(row, col):
        for i in range(row):
            if board[i][col] == 'Q':
                return False
        i, j = row - 1, col - 1
        while i >= 0 and j >= 0:
            if board[i][j] == 'Q':
                return False
            i -= 1
            j -= 1
        i, j = row - 1, col + 1
        while i >= 0 and j < n:
            if board[i][j] == 'Q':
                return False
            i -= 1
            j += 1
        return True

    def solve(row):
        if row == n:
            results.append([''.join(r) for r in board])
            return
        for col in range(n):
            if is_safe(row, col):
                board[row][col] = 'Q'
                solve(row + 1)
                board[row][col] = '.'

    solve(0)
    return results`,
  },
  {
    id: "py-l-19",
    title: "KMP Pattern Matching",
    language: "Python",
    length: "long",
    topic: "strings",
    tags: ["text"],
    difficulty: "hard",
    code: `def build_lps(pattern):
    m = len(pattern)
    lps = [0] * m
    length = 0
    i = 1
    while i < m:
        if pattern[i] == pattern[length]:
            length += 1
            lps[i] = length
            i += 1
        else:
            if length != 0:
                length = lps[length - 1]
            else:
                lps[i] = 0
                i += 1
    return lps

def kmp_search(text, pattern):
    lps = build_lps(pattern)
    n, m = len(text), len(pattern)
    i = j = 0
    while i < n:
        if text[i] == pattern[j]:
            i += 1
            j += 1
        if j == m:
            return i - j
        if i < n and text[i] != pattern[j]:
            if j != 0:
                j = lps[j - 1]
            else:
                i += 1
    return -1`,
  },
  {
    id: "py-l-20",
    title: "Matrix Chain Multiplication",
    language: "Python",
    length: "medium",
    topic: "dp",
    tags: ["optimisation"],
    difficulty: "hard",
    code: `def matrix_chain_order(dims):
    n = len(dims) - 1
    dp = [[0] * n for _ in range(n)]
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            dp[i][j] = float('inf')
            for k in range(i, j):
                cost = (dp[i][k] + dp[k + 1][j]
                    + dims[i] * dims[k + 1] * dims[j + 1])
                dp[i][j] = min(dp[i][j], cost)
    return dp[0][n - 1]`,
  },
  {
    id: "py-l-21",
    title: "Graph Class (Adjacency List)",
    language: "Python",
    length: "long",
    topic: "graphs",
    tags: ["traversal"],
    difficulty: "hard",
    code: `from collections import defaultdict, deque

class Graph:
    def __init__(self):
        self.adj = defaultdict(list)

    def add_edge(self, u, v):
        self.adj[u].append(v)
        self.adj[v].append(u)

    def bfs(self, start):
        visited = set()
        queue = deque([start])
        visited.add(start)
        result = []
        while queue:
            node = queue.popleft()
            result.append(node)
            for neighbor in self.adj[node]:
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(neighbor)
        return result

    def dfs(self, start):
        visited = set()
        result = []
        self._dfs(start, visited, result)
        return result

    def _dfs(self, node, visited, result):
        visited.add(node)
        result.append(node)
        for neighbor in self.adj[node]:
            if neighbor not in visited:
                self._dfs(neighbor, visited, result)`,
  },
  {
    id: "py-l-22",
    title: "Linked List Class",
    language: "Python",
    length: "long",
    topic: "linked-list",
    tags: ["pointers"],
    difficulty: "hard",
    code: `class ListNode:
    def __init__(self, val=0):
        self.val = val
        self.next = None

class LinkedList:
    def __init__(self):
        self.head = None

    def append(self, val):
        new_node = ListNode(val)
        if not self.head:
            self.head = new_node
            return
        curr = self.head
        while curr.next:
            curr = curr.next
        curr.next = new_node

    def prepend(self, val):
        new_node = ListNode(val)
        new_node.next = self.head
        self.head = new_node

    def delete(self, val):
        if not self.head:
            return
        if self.head.val == val:
            self.head = self.head.next
            return
        curr = self.head
        while curr.next and curr.next.val != val:
            curr = curr.next
        if curr.next:
            curr.next = curr.next.next`,
  },
  {
    id: "py-l-23",
    title: "Min Heap Class",
    language: "Python",
    length: "long",
    topic: "heap",
    tags: ["data-structures"],
    difficulty: "hard",
    code: `class MinHeap:
    def __init__(self):
        self.heap = []

    def _sift_up(self, i):
        while i > 0:
            parent = (i - 1) // 2
            if self.heap[parent] > self.heap[i]:
                self.heap[parent], self.heap[i] = (
                    self.heap[i], self.heap[parent])
                i = parent
            else:
                break

    def _sift_down(self, i):
        n = len(self.heap)
        while 2 * i + 1 < n:
            child = 2 * i + 1
            if child + 1 < n and self.heap[child + 1] < self.heap[child]:
                child += 1
            if self.heap[i] > self.heap[child]:
                self.heap[i], self.heap[child] = (
                    self.heap[child], self.heap[i])
                i = child
            else:
                break

    def push(self, val):
        self.heap.append(val)
        self._sift_up(len(self.heap) - 1)

    def pop(self):
        top = self.heap[0]
        self.heap[0] = self.heap[-1]
        self.heap.pop()
        if self.heap:
            self._sift_down(0)
        return top`,
  },
  {
    id: "py-l-24",
    title: "Doubly Linked List",
    language: "Python",
    length: "long",
    topic: "linked-list",
    tags: ["pointers"],
    difficulty: "hard",
    code: `class DLLNode:
    def __init__(self, val):
        self.val = val
        self.prev = None
        self.next = None

class DoublyLinkedList:
    def __init__(self):
        self.head = None
        self.tail = None

    def push_front(self, val):
        node = DLLNode(val)
        node.next = self.head
        if self.head:
            self.head.prev = node
        self.head = node
        if not self.tail:
            self.tail = node

    def push_back(self, val):
        node = DLLNode(val)
        node.prev = self.tail
        if self.tail:
            self.tail.next = node
        self.tail = node
        if not self.head:
            self.head = node

    def pop_front(self):
        if not self.head:
            return None
        val = self.head.val
        self.head = self.head.next
        if self.head:
            self.head.prev = None
        else:
            self.tail = None
        return val`,
  },
  {
    id: "py-l-25",
    title: "Union-Find (DSU)",
    language: "Python",
    length: "long",
    topic: "graphs",
    tags: ["traversal"],
    difficulty: "hard",
    code: `class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n

    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, x, y):
        px, py = self.find(x), self.find(y)
        if px == py:
            return False
        if self.rank[px] < self.rank[py]:
            px, py = py, px
        self.parent[py] = px
        if self.rank[px] == self.rank[py]:
            self.rank[px] += 1
        return True

    def connected(self, x, y):
        return self.find(x) == self.find(y)`,
  },
  {
    id: "py-l-26",
    title: "Floyd-Warshall Algorithm",
    language: "Python",
    length: "medium",
    topic: "graphs",
    tags: ["traversal"],
    difficulty: "hard",
    code: `def floyd_warshall(dist, V):
    for k in range(V):
        for i in range(V):
            for j in range(V):
                if (dist[i][k] != float('inf') and
                    dist[k][j] != float('inf') and
                    dist[i][k] + dist[k][j] < dist[i][j]):
                    dist[i][j] = dist[i][k] + dist[k][j]
    return dist`,
  },
  {
    id: "py-l-27",
    title: "Prim's Algorithm",
    language: "Python",
    length: "long",
    topic: "graphs",
    tags: ["traversal"],
    difficulty: "hard",
    code: `import heapq

def prim_mst(V, adj):
    visited = [False] * V
    pq = [(0, 0)]
    total_weight = 0
    edges_added = 0
    while pq and edges_added < V:
        w, u = heapq.heappop(pq)
        if visited[u]:
            continue
        visited[u] = True
        total_weight += w
        edges_added += 1
        for v, wt in adj[u]:
            if not visited[v]:
                heapq.heappush(pq, (wt, v))
    return total_weight`,
  },
  {
    id: "py-l-28",
    title: "Kruskal's Algorithm",
    language: "Python",
    length: "long",
    topic: "graphs",
    tags: ["traversal"],
    difficulty: "hard",
    code: `class KruskalUF:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n

    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, x, y):
        px, py = self.find(x), self.find(y)
        if px == py:
            return False
        if self.rank[px] < self.rank[py]:
            px, py = py, px
        self.parent[py] = px
        if self.rank[px] == self.rank[py]:
            self.rank[px] += 1
        return True

def kruskal(V, edges):
    edges.sort(key=lambda e: e[2])
    uf = KruskalUF(V)
    mst_weight = 0
    for u, v, w in edges:
        if uf.union(u, v):
            mst_weight += w
    return mst_weight`,
  },
  {
    id: "py-l-29",
    title: "String Permutations",
    language: "Python",
    length: "medium",
    topic: "recursion",
    tags: ["backtracking"],
    difficulty: "medium",
    code: `def permutations(s):
    result = []

    def backtrack(path, remaining):
        if not remaining:
            result.append(path)
            return
        for i in range(len(remaining)):
            backtrack(
                path + remaining[i],
                remaining[:i] + remaining[i + 1:]
            )

    backtrack("", s)
    return result`,
  },
  {
    id: "py-l-30",
    title: "Sudoku Validator",
    language: "Python",
    length: "long",
    topic: "matrix",
    tags: ["arrays"],
    difficulty: "hard",
    code: `def is_valid_sudoku(board):
    rows = [set() for _ in range(9)]
    cols = [set() for _ in range(9)]
    boxes = [set() for _ in range(9)]
    for i in range(9):
        for j in range(9):
            val = board[i][j]
            if val == '.':
                continue
            box_idx = (i // 3) * 3 + j // 3
            if (val in rows[i] or
                val in cols[j] or
                val in boxes[box_idx]):
                return False
            rows[i].add(val)
            cols[j].add(val)
            boxes[box_idx].add(val)
    return True`,
  },
  {
    id: "py-l-31",
    title: "Rate Limiter (Token Bucket)",
    language: "Python",
    length: "long",
    topic: "async",
    tags: ["timing"],
    difficulty: "hard",
    code: `import time

class RateLimiter:
    def __init__(self, max_tokens, refill_rate):
        self.max_tokens = max_tokens
        self.refill_rate = refill_rate
        self.tokens = max_tokens
        self.last_refill = time.time()

    def _refill(self):
        now = time.time()
        elapsed = now - self.last_refill
        new_tokens = elapsed * self.refill_rate
        self.tokens = min(self.max_tokens,
            self.tokens + new_tokens)
        self.last_refill = now

    def allow_request(self):
        self._refill()
        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False`,
  },
  {
    id: "py-l-32",
    title: "Segment Tree (Range Sum)",
    language: "Python",
    length: "long",
    topic: "trees",
    tags: ["recursion"],
    difficulty: "hard",
    code: `class SegmentTree:
    def __init__(self, arr):
        self.n = len(arr)
        self.tree = [0] * (4 * self.n)
        self._build(arr, 1, 0, self.n - 1)

    def _build(self, arr, node, start, end):
        if start == end:
            self.tree[node] = arr[start]
            return
        mid = (start + end) // 2
        self._build(arr, 2 * node, start, mid)
        self._build(arr, 2 * node + 1, mid + 1, end)
        self.tree[node] = (self.tree[2 * node]
            + self.tree[2 * node + 1])

    def query(self, node, start, end, l, r):
        if r < start or end < l:
            return 0
        if l <= start and end <= r:
            return self.tree[node]
        mid = (start + end) // 2
        return (self.query(2 * node, start, mid, l, r)
            + self.query(2 * node + 1, mid + 1, end, l, r))

    def range_sum(self, l, r):
        return self.query(1, 0, self.n - 1, l, r)`,
  },
  {
    id: "py-l-33",
    title: "Binary Search Tree (Delete)",
    language: "Python",
    length: "long",
    topic: "trees",
    tags: ["recursion"],
    difficulty: "hard",
    code: `class TreeNode:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

def find_min(node):
    while node.left:
        node = node.left
    return node

def delete_node(root, key):
    if root is None:
        return None
    if key < root.val:
        root.left = delete_node(root.left, key)
    elif key > root.val:
        root.right = delete_node(root.right, key)
    else:
        if root.left is None:
            return root.right
        if root.right is None:
            return root.left
        successor = find_min(root.right)
        root.val = successor.val
        root.right = delete_node(
            root.right, successor.val)
    return root`,
  },

  ...javascriptSnippets,
  ...extraSnippets,
  ...topicFillSnippets,
];

export default codeSnippets;
