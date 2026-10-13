/* ═══════════════════════════════════════════════════════════════
   javascriptSnippets.js — JavaScript typing dataset
   ─────────────────────────────────────────────────────────────
   100 snippets: 33 short (1–5 lines), 34 medium (6–15 lines) and
   33 long (16+ lines), matching the shape used by codeSnippets.js
   so `pickSnippet` can filter them the same way.

   Kept in its own module rather than appended to codeSnippets.js,
   which was already 3.5k lines.

   AUTHORING RULES — these snippets live inside template literals,
   so the code must never contain a backtick, a "${" or a
   backslash. A backslash would be silently eaten (an untagged
   template turns "\d" into "d"), which would quietly corrupt a
   regex into something that still parses but no longer matches.
   Regexes without escapes, like /[aeiou]/gi, are fine.
   ═══════════════════════════════════════════════════════════════ */

const javascriptSnippets = [
  /* ═══════════════════════════════════════════════════════════
     JavaScript — SHORT  (33 snippets, 1–5 lines)
     ═══════════════════════════════════════════════════════════ */

  {
    id: "js-s-1",
    title: "Swap Two Values",
    language: "JavaScript",
    length: "short",
    topic: "basics",
    tags: ["fundamentals"],
    difficulty: "easy",
    code: `function swap(a, b) {
  [a, b] = [b, a];
  return [a, b];
}`,
  },
  {
    id: "js-s-2",
    title: "Max of Two",
    language: "JavaScript",
    length: "short",
    topic: "basics",
    tags: ["fundamentals"],
    difficulty: "easy",
    code: `function maxOfTwo(a, b) {
  return a > b ? a : b;
}`,
  },
  {
    id: "js-s-3",
    title: "Min of Two",
    language: "JavaScript",
    length: "short",
    topic: "basics",
    tags: ["fundamentals"],
    difficulty: "easy",
    code: `function minOfTwo(a, b) {
  return a < b ? a : b;
}`,
  },
  {
    id: "js-s-4",
    title: "Sum an Array",
    language: "JavaScript",
    length: "short",
    topic: "arrays",
    tags: ["indexing"],
    difficulty: "easy",
    code: `function sum(nums) {
  return nums.reduce((acc, n) => acc + n, 0);
}`,
  },
  {
    id: "js-s-5",
    title: "Reverse a String",
    language: "JavaScript",
    length: "short",
    topic: "strings",
    tags: ["text"],
    difficulty: "easy",
    code: `function reverse(str) {
  return str.split("").reverse().join("");
}`,
  },
  {
    id: "js-s-6",
    title: "Is Even",
    language: "JavaScript",
    length: "short",
    topic: "basics",
    tags: ["fundamentals"],
    difficulty: "easy",
    code: `function isEven(n) {
  return n % 2 === 0;
}`,
  },
  {
    id: "js-s-7",
    title: "Factorial",
    language: "JavaScript",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}`,
  },
  {
    id: "js-s-8",
    title: "Fibonacci",
    language: "JavaScript",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `function fib(n) {
  if (n < 2) return n;
  return fib(n - 1) + fib(n - 2);
}`,
  },
  {
    id: "js-s-9",
    title: "Palindrome Check",
    language: "JavaScript",
    length: "short",
    topic: "strings",
    tags: ["text"],
    difficulty: "easy",
    code: `function isPalindrome(str) {
  const clean = str.toLowerCase();
  return clean === clean.split("").reverse().join("");
}`,
  },
  {
    id: "js-s-10",
    title: "Clamp a Number",
    language: "JavaScript",
    length: "short",
    topic: "basics",
    tags: ["fundamentals"],
    difficulty: "easy",
    code: `function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}`,
  },
  {
    id: "js-s-11",
    title: "Last Element",
    language: "JavaScript",
    length: "short",
    topic: "basics",
    tags: ["fundamentals"],
    difficulty: "easy",
    code: `function last(arr) {
  return arr[arr.length - 1];
}`,
  },
  {
    id: "js-s-12",
    title: "Unique Values",
    language: "JavaScript",
    length: "short",
    topic: "arrays",
    tags: ["indexing"],
    difficulty: "easy",
    code: `function unique(arr) {
  return [...new Set(arr)];
}`,
  },
  {
    id: "js-s-13",
    title: "Flatten One Level",
    language: "JavaScript",
    length: "short",
    topic: "arrays",
    tags: ["indexing"],
    difficulty: "easy",
    code: `function flatten(arr) {
  return arr.reduce((acc, item) => acc.concat(item), []);
}`,
  },
  {
    id: "js-s-14",
    title: "Capitalize Word",
    language: "JavaScript",
    length: "short",
    topic: "strings",
    tags: ["text"],
    difficulty: "easy",
    code: `function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}`,
  },
  {
    id: "js-s-15",
    title: "Random Integer",
    language: "JavaScript",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `function randomInt(low, high) {
  return Math.floor(Math.random() * (high - low + 1)) + low;
}`,
  },
  {
    id: "js-s-16",
    title: "Average",
    language: "JavaScript",
    length: "short",
    topic: "arrays",
    tags: ["indexing"],
    difficulty: "easy",
    code: `function average(nums) {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}`,
  },
  {
    id: "js-s-17",
    title: "Count Occurrences",
    language: "JavaScript",
    length: "short",
    topic: "hashing",
    tags: ["counting"],
    difficulty: "easy",
    code: `function countOf(arr, target) {
  return arr.filter((item) => item === target).length;
}`,
  },
  {
    id: "js-s-18",
    title: "Is Empty Object",
    language: "JavaScript",
    length: "short",
    topic: "basics",
    tags: ["fundamentals"],
    difficulty: "easy",
    code: `function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}`,
  },
  {
    id: "js-s-19",
    title: "Sleep",
    language: "JavaScript",
    length: "short",
    topic: "async",
    tags: ["timing"],
    difficulty: "easy",
    code: `function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}`,
  },
  {
    id: "js-s-20",
    title: "Sum of Digits",
    language: "JavaScript",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `function digitSum(n) {
  return String(n)
    .split("")
    .reduce((total, d) => total + Number(d), 0);
}`,
  },
  {
    id: "js-s-21",
    title: "Greatest Common Divisor",
    language: "JavaScript",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}`,
  },
  {
    id: "js-s-22",
    title: "Least Common Multiple",
    language: "JavaScript",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `function lcm(a, b) {
  return (a * b) / gcd(a, b);
}`,
  },
  {
    id: "js-s-23",
    title: "Integer Power",
    language: "JavaScript",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `function power(base, exp) {
  if (exp === 0) return 1;
  return base * power(base, exp - 1);
}`,
  },
  {
    id: "js-s-24",
    title: "Range Array",
    language: "JavaScript",
    length: "short",
    topic: "functional",
    tags: ["idioms"],
    difficulty: "easy",
    code: `function range(n) {
  return Array.from({ length: n }, (_, i) => i);
}`,
  },
  {
    id: "js-s-25",
    title: "Zip Two Arrays",
    language: "JavaScript",
    length: "short",
    topic: "functional",
    tags: ["idioms"],
    difficulty: "easy",
    code: `function zip(a, b) {
  return a.map((item, i) => [item, b[i]]);
}`,
  },
  {
    id: "js-s-26",
    title: "Remove Falsy Values",
    language: "JavaScript",
    length: "short",
    topic: "functional",
    tags: ["idioms"],
    difficulty: "easy",
    code: `function compact(arr) {
  return arr.filter(Boolean);
}`,
  },
  {
    id: "js-s-27",
    title: "Degrees to Radians",
    language: "JavaScript",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}`,
  },
  {
    id: "js-s-28",
    title: "Celsius to Fahrenheit",
    language: "JavaScript",
    length: "short",
    topic: "math",
    tags: ["numbers"],
    difficulty: "easy",
    code: `function toFahrenheit(celsius) {
  return celsius * 1.8 + 32;
}`,
  },
  {
    id: "js-s-29",
    title: "Count Vowels",
    language: "JavaScript",
    length: "short",
    topic: "strings",
    tags: ["text"],
    difficulty: "easy",
    code: `function countVowels(str) {
  const found = str.match(/[aeiou]/gi);
  return found === null ? 0 : found.length;
}`,
  },
  {
    id: "js-s-30",
    title: "Truncate String",
    language: "JavaScript",
    length: "short",
    topic: "strings",
    tags: ["text"],
    difficulty: "easy",
    code: `function truncate(str, max) {
  if (str.length <= max) return str;
  return str.slice(0, max) + "...";
}`,
  },
  {
    id: "js-s-31",
    title: "Head and Tail",
    language: "JavaScript",
    length: "short",
    topic: "functional",
    tags: ["idioms"],
    difficulty: "easy",
    code: `function headTail(arr) {
  const [head, ...tail] = arr;
  return { head, tail };
}`,
  },
  {
    id: "js-s-32",
    title: "Pick Random Item",
    language: "JavaScript",
    length: "short",
    topic: "functional",
    tags: ["idioms"],
    difficulty: "easy",
    code: `function sample(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}`,
  },
  {
    id: "js-s-33",
    title: "Binary to Decimal",
    language: "JavaScript",
    length: "short",
    topic: "bits",
    tags: ["binary"],
    difficulty: "easy",
    code: `function binaryToDecimal(bits) {
  return parseInt(bits, 2);
}`,
  },

  /* ═══════════════════════════════════════════════════════════
     JavaScript — MEDIUM  (34 snippets, 6–15 lines)
     ═══════════════════════════════════════════════════════════ */

  {
    id: "js-m-1",
    title: "Binary Search",
    language: "JavaScript",
    length: "medium",
    topic: "searching",
    tags: ["arrays"],
    difficulty: "medium",
    code: `function binarySearch(nums, target) {
  let low = 0;
  let high = nums.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) low = mid + 1;
    else high = mid - 1;
  }
  return -1;
}`,
  },
  {
    id: "js-m-2",
    title: "Bubble Sort",
    language: "JavaScript",
    length: "medium",
    topic: "sorting",
    tags: ["arrays"],
    difficulty: "medium",
    code: `function bubbleSort(nums) {
  const arr = [...nums];
  for (let i = 0; i < arr.length - 1; i++) {
    for (let j = 0; j < arr.length - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  return arr;
}`,
  },
  {
    id: "js-m-3",
    title: "Selection Sort",
    language: "JavaScript",
    length: "medium",
    topic: "sorting",
    tags: ["arrays"],
    difficulty: "medium",
    code: `function selectionSort(nums) {
  const arr = [...nums];
  for (let i = 0; i < arr.length; i++) {
    let lowest = i;
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[j] < arr[lowest]) lowest = j;
    }
    [arr[i], arr[lowest]] = [arr[lowest], arr[i]];
  }
  return arr;
}`,
  },
  {
    id: "js-m-4",
    title: "Insertion Sort",
    language: "JavaScript",
    length: "medium",
    topic: "sorting",
    tags: ["arrays"],
    difficulty: "medium",
    code: `function insertionSort(nums) {
  const arr = [...nums];
  for (let i = 1; i < arr.length; i++) {
    const current = arr[i];
    let j = i - 1;
    while (j >= 0 && arr[j] > current) {
      arr[j + 1] = arr[j];
      j--;
    }
    arr[j + 1] = current;
  }
  return arr;
}`,
  },
  {
    id: "js-m-5",
    title: "Two Sum",
    language: "JavaScript",
    length: "medium",
    topic: "arrays",
    tags: ["indexing"],
    difficulty: "medium",
    code: `function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);
  }
  return [];
}`,
  },
  {
    id: "js-m-6",
    title: "FizzBuzz",
    language: "JavaScript",
    length: "medium",
    topic: "basics",
    tags: ["fundamentals"],
    difficulty: "medium",
    code: `function fizzBuzz(n) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    if (i % 15 === 0) out.push("FizzBuzz");
    else if (i % 3 === 0) out.push("Fizz");
    else if (i % 5 === 0) out.push("Buzz");
    else out.push(String(i));
  }
  return out;
}`,
  },
  {
    id: "js-m-7",
    title: "Debounce",
    language: "JavaScript",
    length: "medium",
    topic: "async",
    tags: ["timing"],
    difficulty: "medium",
    code: `function debounce(fn, wait) {
  let timer = null;
  return function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, wait);
  };
}`,
  },
  {
    id: "js-m-8",
    title: "Throttle",
    language: "JavaScript",
    length: "medium",
    topic: "async",
    tags: ["timing"],
    difficulty: "medium",
    code: `function throttle(fn, interval) {
  let lastRun = 0;
  return function throttled(...args) {
    const now = Date.now();
    if (now - lastRun < interval) return;
    lastRun = now;
    return fn.apply(this, args);
  };
}`,
  },
  {
    id: "js-m-9",
    title: "Deep Clone",
    language: "JavaScript",
    length: "medium",
    topic: "functional",
    tags: ["idioms"],
    difficulty: "medium",
    code: `function deepClone(value) {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(deepClone);
  }
  const copy = {};
  for (const key of Object.keys(value)) {
    copy[key] = deepClone(value[key]);
  }
  return copy;
}`,
  },
  {
    id: "js-m-10",
    title: "Group By",
    language: "JavaScript",
    length: "medium",
    topic: "functional",
    tags: ["idioms"],
    difficulty: "medium",
    code: `function groupBy(items, keyFn) {
  const groups = {};
  for (const item of items) {
    const key = keyFn(item);
    if (groups[key] === undefined) {
      groups[key] = [];
    }
    groups[key].push(item);
  }
  return groups;
}`,
  },
  {
    id: "js-m-11",
    title: "Memoize",
    language: "JavaScript",
    length: "medium",
    topic: "functional",
    tags: ["idioms"],
    difficulty: "medium",
    code: `function memoize(fn) {
  const cache = new Map();
  return function memoized(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}`,
  },
  {
    id: "js-m-12",
    title: "Merge Sorted Arrays",
    language: "JavaScript",
    length: "medium",
    topic: "sorting",
    tags: ["arrays"],
    difficulty: "medium",
    code: `function mergeSorted(a, b) {
  const out = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] <= b[j]) out.push(a[i++]);
    else out.push(b[j++]);
  }
  return out.concat(a.slice(i)).concat(b.slice(j));
}`,
  },
  {
    id: "js-m-13",
    title: "Maximum Subarray",
    language: "JavaScript",
    length: "medium",
    topic: "dp",
    tags: ["optimisation"],
    difficulty: "hard",
    code: `function maxSubArray(nums) {
  let best = nums[0];
  let running = nums[0];
  for (let i = 1; i < nums.length; i++) {
    running = Math.max(nums[i], running + nums[i]);
    best = Math.max(best, running);
  }
  return best;
}`,
  },
  {
    id: "js-m-14",
    title: "Move Zeroes",
    language: "JavaScript",
    length: "medium",
    topic: "arrays",
    tags: ["indexing"],
    difficulty: "medium",
    code: `function moveZeroes(nums) {
  let insertAt = 0;
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] !== 0) {
      nums[insertAt] = nums[i];
      insertAt++;
    }
  }
  while (insertAt < nums.length) {
    nums[insertAt++] = 0;
  }
  return nums;
}`,
  },
  {
    id: "js-m-15",
    title: "Valid Parentheses",
    language: "JavaScript",
    length: "medium",
    topic: "stack-queue",
    tags: ["data-structures"],
    difficulty: "medium",
    code: `function isValid(str) {
  const pairs = { ")": "(", "]": "[", "}": "{" };
  const stack = [];
  for (const ch of str) {
    if (ch === "(" || ch === "[" || ch === "{") {
      stack.push(ch);
    } else if (stack.pop() !== pairs[ch]) {
      return false;
    }
  }
  return stack.length === 0;
}`,
  },
  {
    id: "js-m-16",
    title: "Anagram Check",
    language: "JavaScript",
    length: "medium",
    topic: "hashing",
    tags: ["counting"],
    difficulty: "medium",
    code: `function isAnagram(a, b) {
  if (a.length !== b.length) return false;
  const counts = new Map();
  for (const ch of a) {
    counts.set(ch, (counts.get(ch) || 0) + 1);
  }
  for (const ch of b) {
    if (!counts.get(ch)) return false;
    counts.set(ch, counts.get(ch) - 1);
  }
  return true;
}`,
  },
  {
    id: "js-m-17",
    title: "Climbing Stairs",
    language: "JavaScript",
    length: "medium",
    topic: "dp",
    tags: ["optimisation"],
    difficulty: "hard",
    code: `function climbStairs(n) {
  if (n <= 2) return n;
  let prev = 1;
  let curr = 2;
  for (let i = 3; i <= n; i++) {
    const next = prev + curr;
    prev = curr;
    curr = next;
  }
  return curr;
}`,
  },
  {
    id: "js-m-18",
    title: "Best Time to Buy and Sell",
    language: "JavaScript",
    length: "medium",
    topic: "dp",
    tags: ["optimisation"],
    difficulty: "hard",
    code: `function maxProfit(prices) {
  let cheapest = Infinity;
  let profit = 0;
  for (const price of prices) {
    if (price < cheapest) cheapest = price;
    else profit = Math.max(profit, price - cheapest);
  }
  return profit;
}`,
  },
  {
    id: "js-m-19",
    title: "Product Except Self",
    language: "JavaScript",
    length: "medium",
    topic: "arrays",
    tags: ["indexing"],
    difficulty: "medium",
    code: `function productExceptSelf(nums) {
  const out = new Array(nums.length).fill(1);
  let running = 1;
  for (let i = 0; i < nums.length; i++) {
    out[i] = running;
    running *= nums[i];
  }
  running = 1;
  for (let i = nums.length - 1; i >= 0; i--) {
    out[i] *= running;
    running *= nums[i];
  }
  return out;
}`,
  },
  {
    id: "js-m-20",
    title: "Rotate Array",
    language: "JavaScript",
    length: "medium",
    topic: "arrays",
    tags: ["indexing"],
    difficulty: "medium",
    code: `function rotate(nums, k) {
  const size = nums.length;
  const shift = k % size;
  if (shift === 0) return nums;
  const tail = nums.splice(size - shift, shift);
  nums.unshift(...tail);
  return nums;
}`,
  },
  {
    id: "js-m-21",
    title: "Array Intersection",
    language: "JavaScript",
    length: "medium",
    topic: "hashing",
    tags: ["counting"],
    difficulty: "medium",
    code: `function intersection(a, b) {
  const inB = new Set(b);
  const out = new Set();
  for (const item of a) {
    if (inB.has(item)) out.add(item);
  }
  return [...out];
}`,
  },
  {
    id: "js-m-22",
    title: "First Unique Character",
    language: "JavaScript",
    length: "medium",
    topic: "hashing",
    tags: ["counting"],
    difficulty: "medium",
    code: `function firstUniqChar(str) {
  const counts = new Map();
  for (const ch of str) {
    counts.set(ch, (counts.get(ch) || 0) + 1);
  }
  for (let i = 0; i < str.length; i++) {
    if (counts.get(str[i]) === 1) return i;
  }
  return -1;
}`,
  },
  {
    id: "js-m-23",
    title: "Longest Common Prefix",
    language: "JavaScript",
    length: "medium",
    topic: "strings",
    tags: ["text"],
    difficulty: "medium",
    code: `function longestCommonPrefix(words) {
  if (words.length === 0) return "";
  let prefix = words[0];
  for (const word of words) {
    while (word.indexOf(prefix) !== 0) {
      prefix = prefix.slice(0, -1);
      if (prefix === "") return "";
    }
  }
  return prefix;
}`,
  },
  {
    id: "js-m-24",
    title: "Flatten Deeply",
    language: "JavaScript",
    length: "medium",
    topic: "arrays",
    tags: ["indexing"],
    difficulty: "medium",
    code: `function flattenDeep(arr) {
  const out = [];
  for (const item of arr) {
    if (Array.isArray(item)) {
      out.push(...flattenDeep(item));
    } else {
      out.push(item);
    }
  }
  return out;
}`,
  },
  {
    id: "js-m-25",
    title: "Chunk an Array",
    language: "JavaScript",
    length: "medium",
    topic: "arrays",
    tags: ["indexing"],
    difficulty: "medium",
    code: `function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}`,
  },
  {
    id: "js-m-26",
    title: "Compose Functions",
    language: "JavaScript",
    length: "medium",
    topic: "functional",
    tags: ["idioms"],
    difficulty: "medium",
    code: `function compose(...fns) {
  return function composed(value) {
    let result = value;
    for (let i = fns.length - 1; i >= 0; i--) {
      result = fns[i](result);
    }
    return result;
  };
}`,
  },
  {
    id: "js-m-27",
    title: "Retry with Backoff",
    language: "JavaScript",
    length: "medium",
    topic: "async",
    tags: ["timing"],
    difficulty: "medium",
    code: `async function retry(fn, attempts) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === attempts - 1) throw err;
      const wait = 100 * Math.pow(2, i);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}`,
  },
  {
    id: "js-m-28",
    title: "Stack Class",
    language: "JavaScript",
    length: "medium",
    topic: "stack-queue",
    tags: ["data-structures"],
    difficulty: "medium",
    code: `class Stack {
  constructor() {
    this.items = [];
  }
  push(value) {
    this.items.push(value);
  }
  pop() {
    return this.items.pop();
  }
  peek() {
    return this.items[this.items.length - 1];
  }
}`,
  },
  {
    id: "js-m-29",
    title: "Queue Class",
    language: "JavaScript",
    length: "medium",
    topic: "stack-queue",
    tags: ["data-structures"],
    difficulty: "medium",
    code: `class Queue {
  constructor() {
    this.items = [];
    this.head = 0;
  }
  enqueue(value) {
    this.items.push(value);
  }
  dequeue() {
    if (this.head >= this.items.length) return undefined;
    return this.items[this.head++];
  }
}`,
  },
  {
    id: "js-m-30",
    title: "Count Word Frequency",
    language: "JavaScript",
    length: "medium",
    topic: "hashing",
    tags: ["counting"],
    difficulty: "medium",
    code: `function wordFrequency(text) {
  const words = text.toLowerCase().split(" ");
  const counts = new Map();
  for (const word of words) {
    if (word === "") continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  return counts;
}`,
  },
  {
    id: "js-m-31",
    title: "Contains Duplicate",
    language: "JavaScript",
    length: "medium",
    topic: "hashing",
    tags: ["counting"],
    difficulty: "medium",
    code: `function containsDuplicate(nums) {
  const seen = new Set();
  for (const n of nums) {
    if (seen.has(n)) return true;
    seen.add(n);
  }
  return false;
}`,
  },
  {
    id: "js-m-32",
    title: "Missing Number",
    language: "JavaScript",
    length: "medium",
    topic: "arrays",
    tags: ["indexing"],
    difficulty: "medium",
    code: `function missingNumber(nums) {
  const size = nums.length;
  const expected = (size * (size + 1)) / 2;
  let actual = 0;
  for (const n of nums) {
    actual += n;
  }
  return expected - actual;
}`,
  },
  {
    id: "js-m-33",
    title: "Reverse Words in Place",
    language: "JavaScript",
    length: "medium",
    topic: "strings",
    tags: ["text"],
    difficulty: "medium",
    code: `function reverseWords(sentence) {
  const words = sentence.split(" ").filter(Boolean);
  let low = 0;
  let high = words.length - 1;
  while (low < high) {
    [words[low], words[high]] = [words[high], words[low]];
    low++;
    high--;
  }
  return words.join(" ");
}`,
  },
  {
    id: "js-m-34",
    title: "Fisher-Yates Shuffle",
    language: "JavaScript",
    length: "medium",
    topic: "sorting",
    tags: ["arrays"],
    difficulty: "medium",
    code: `function shuffle(nums) {
  const arr = [...nums];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}`,
  },

  /* ═══════════════════════════════════════════════════════════
     JavaScript — LONG  (33 snippets, 16+ lines)
     ═══════════════════════════════════════════════════════════ */

  {
    id: "js-l-1",
    title: "Quick Sort",
    language: "JavaScript",
    length: "long",
    topic: "sorting",
    tags: ["arrays"],
    difficulty: "hard",
    code: `function quickSort(nums) {
  if (nums.length <= 1) return nums;
  const pivot = nums[nums.length - 1];
  const left = [];
  const right = [];
  const equal = [];
  for (const n of nums) {
    if (n < pivot) {
      left.push(n);
    } else if (n > pivot) {
      right.push(n);
    } else {
      equal.push(n);
    }
  }
  return [
    ...quickSort(left),
    ...equal,
    ...quickSort(right),
  ];
}`,
  },
  {
    id: "js-l-2",
    title: "Merge Sort",
    language: "JavaScript",
    length: "long",
    topic: "sorting",
    tags: ["arrays"],
    difficulty: "hard",
    code: `function mergeSort(nums) {
  if (nums.length <= 1) return nums;
  const mid = Math.floor(nums.length / 2);
  const left = mergeSort(nums.slice(0, mid));
  const right = mergeSort(nums.slice(mid));
  const out = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) {
      out.push(left[i]);
      i++;
    } else {
      out.push(right[j]);
      j++;
    }
  }
  while (i < left.length) out.push(left[i++]);
  while (j < right.length) out.push(right[j++]);
  return out;
}`,
  },
  {
    id: "js-l-3",
    title: "Heap Sort",
    language: "JavaScript",
    length: "long",
    topic: "sorting",
    tags: ["heap"],
    difficulty: "hard",
    code: `function heapSort(nums) {
  const arr = [...nums];
  const size = arr.length;

  function sink(root, limit) {
    let largest = root;
    const left = 2 * root + 1;
    const right = 2 * root + 2;
    if (left < limit && arr[left] > arr[largest]) largest = left;
    if (right < limit && arr[right] > arr[largest]) largest = right;
    if (largest !== root) {
      [arr[root], arr[largest]] = [arr[largest], arr[root]];
      sink(largest, limit);
    }
  }

  for (let i = Math.floor(size / 2) - 1; i >= 0; i--) {
    sink(i, size);
  }
  for (let i = size - 1; i > 0; i--) {
    [arr[0], arr[i]] = [arr[i], arr[0]];
    sink(0, i);
  }
  return arr;
}`,
  },
  {
    id: "js-l-4",
    title: "Breadth First Search",
    language: "JavaScript",
    length: "long",
    topic: "graphs",
    tags: ["traversal"],
    difficulty: "hard",
    code: `function bfs(graph, start) {
  const visited = new Set([start]);
  const order = [];
  const queue = [start];
  let head = 0;
  while (head < queue.length) {
    const node = queue[head];
    head++;
    order.push(node);
    const neighbours = graph[node] || [];
    for (const next of neighbours) {
      if (visited.has(next)) continue;
      visited.add(next);
      queue.push(next);
    }
  }
  return order;
}`,
  },
  {
    id: "js-l-5",
    title: "Depth First Search",
    language: "JavaScript",
    length: "long",
    topic: "graphs",
    tags: ["traversal"],
    difficulty: "hard",
    code: `function dfs(graph, start) {
  const visited = new Set();
  const order = [];

  function walk(node) {
    if (visited.has(node)) return;
    visited.add(node);
    order.push(node);
    const neighbours = graph[node] || [];
    for (const next of neighbours) {
      walk(next);
    }
  }

  walk(start);
  return order;
}`,
  },
  {
    id: "js-l-6",
    title: "Linked List",
    language: "JavaScript",
    length: "long",
    topic: "linked-list",
    tags: ["pointers"],
    difficulty: "hard",
    code: `class ListNode {
  constructor(value) {
    this.value = value;
    this.next = null;
  }
}

class LinkedList {
  constructor() {
    this.head = null;
    this.size = 0;
  }
  push(value) {
    const node = new ListNode(value);
    if (this.head === null) {
      this.head = node;
    } else {
      let curr = this.head;
      while (curr.next !== null) {
        curr = curr.next;
      }
      curr.next = node;
    }
    this.size++;
    return this;
  }
  toArray() {
    const out = [];
    let curr = this.head;
    while (curr !== null) {
      out.push(curr.value);
      curr = curr.next;
    }
    return out;
  }
}`,
  },
  {
    id: "js-l-7",
    title: "Reverse a Linked List",
    language: "JavaScript",
    length: "long",
    topic: "linked-list",
    tags: ["pointers"],
    difficulty: "hard",
    code: `function reverseList(head) {
  let prev = null;
  let curr = head;
  while (curr !== null) {
    const next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }
  return prev;
}

function hasCycle(head) {
  let slow = head;
  let fast = head;
  while (fast !== null && fast.next !== null) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}`,
  },
  {
    id: "js-l-8",
    title: "Binary Search Tree",
    language: "JavaScript",
    length: "long",
    topic: "trees",
    tags: ["recursion"],
    difficulty: "hard",
    code: `class TreeNode {
  constructor(value) {
    this.value = value;
    this.left = null;
    this.right = null;
  }
}

class BinarySearchTree {
  constructor() {
    this.root = null;
  }
  insert(value) {
    const node = new TreeNode(value);
    if (this.root === null) {
      this.root = node;
      return this;
    }
    let curr = this.root;
    while (true) {
      if (value < curr.value) {
        if (curr.left === null) {
          curr.left = node;
          return this;
        }
        curr = curr.left;
      } else {
        if (curr.right === null) {
          curr.right = node;
          return this;
        }
        curr = curr.right;
      }
    }
  }
  contains(value) {
    let curr = this.root;
    while (curr !== null) {
      if (value === curr.value) return true;
      curr = value < curr.value ? curr.left : curr.right;
    }
    return false;
  }
}`,
  },
  {
    id: "js-l-9",
    title: "Tree Traversals",
    language: "JavaScript",
    length: "long",
    topic: "trees",
    tags: ["recursion"],
    difficulty: "hard",
    code: `function inorder(node, out = []) {
  if (node === null) return out;
  inorder(node.left, out);
  out.push(node.value);
  inorder(node.right, out);
  return out;
}

function preorder(node, out = []) {
  if (node === null) return out;
  out.push(node.value);
  preorder(node.left, out);
  preorder(node.right, out);
  return out;
}

function postorder(node, out = []) {
  if (node === null) return out;
  postorder(node.left, out);
  postorder(node.right, out);
  out.push(node.value);
  return out;
}`,
  },
  {
    id: "js-l-10",
    title: "Level Order Traversal",
    language: "JavaScript",
    length: "long",
    topic: "trees",
    tags: ["recursion"],
    difficulty: "hard",
    code: `function levelOrder(root) {
  if (root === null) return [];
  const levels = [];
  let current = [root];
  while (current.length > 0) {
    const values = [];
    const next = [];
    for (const node of current) {
      values.push(node.value);
      if (node.left !== null) next.push(node.left);
      if (node.right !== null) next.push(node.right);
    }
    levels.push(values);
    current = next;
  }
  return levels;
}`,
  },
  {
    id: "js-l-11",
    title: "Validate BST",
    language: "JavaScript",
    length: "long",
    topic: "trees",
    tags: ["recursion"],
    difficulty: "hard",
    code: `function isValidBST(root) {
  function check(node, low, high) {
    if (node === null) return true;
    if (low !== null && node.value <= low) {
      return false;
    }
    if (high !== null && node.value >= high) {
      return false;
    }
    return (
      check(node.left, low, node.value) &&
      check(node.right, node.value, high)
    );
  }
  return check(root, null, null);
}

function maxDepth(node) {
  if (node === null) return 0;
  const left = maxDepth(node.left);
  const right = maxDepth(node.right);
  return Math.max(left, right) + 1;
}`,
  },
  {
    id: "js-l-12",
    title: "Trie",
    language: "JavaScript",
    length: "long",
    topic: "trees",
    tags: ["recursion"],
    difficulty: "hard",
    code: `class Trie {
  constructor() {
    this.root = {};
  }
  insert(word) {
    let node = this.root;
    for (const ch of word) {
      if (node[ch] === undefined) {
        node[ch] = {};
      }
      node = node[ch];
    }
    node.isWord = true;
  }
  search(word) {
    const node = this.walk(word);
    return node !== null && node.isWord === true;
  }
  startsWith(prefix) {
    return this.walk(prefix) !== null;
  }
  walk(chars) {
    let node = this.root;
    for (const ch of chars) {
      if (node[ch] === undefined) return null;
      node = node[ch];
    }
    return node;
  }
}`,
  },
  {
    id: "js-l-13",
    title: "LRU Cache",
    language: "JavaScript",
    length: "long",
    topic: "hashing",
    tags: ["counting"],
    difficulty: "hard",
    code: `class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();
  }
  get(key) {
    if (!this.map.has(key)) return -1;
    const value = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }
  put(key, value) {
    if (this.map.has(key)) {
      this.map.delete(key);
    }
    this.map.set(key, value);
    if (this.map.size > this.capacity) {
      const oldest = this.map.keys().next().value;
      this.map.delete(oldest);
    }
  }
}`,
  },
  {
    id: "js-l-14",
    title: "Min Heap",
    language: "JavaScript",
    length: "long",
    topic: "heap",
    tags: ["data-structures"],
    difficulty: "hard",
    code: `class MinHeap {
  constructor() {
    this.items = [];
  }
  push(value) {
    this.items.push(value);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.items[parent] <= this.items[i]) break;
      [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]];
      i = parent;
    }
  }
  pop() {
    if (this.items.length === 0) return undefined;
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0) {
      this.items[0] = last;
      this.sink(0);
    }
    return top;
  }
  sink(i) {
    const size = this.items.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < size && this.items[left] < this.items[smallest]) smallest = left;
      if (right < size && this.items[right] < this.items[smallest]) smallest = right;
      if (smallest === i) return;
      [this.items[i], this.items[smallest]] = [this.items[smallest], this.items[i]];
      i = smallest;
    }
  }
}`,
  },
  {
    id: "js-l-15",
    title: "Union Find",
    language: "JavaScript",
    length: "long",
    topic: "graphs",
    tags: ["traversal"],
    difficulty: "hard",
    code: `class UnionFind {
  constructor(size) {
    this.parent = Array.from({ length: size }, (_, i) => i);
    this.rank = new Array(size).fill(0);
  }
  find(x) {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]];
      x = this.parent[x];
    }
    return x;
  }
  union(a, b) {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA === rootB) return false;
    if (this.rank[rootA] < this.rank[rootB]) {
      this.parent[rootA] = rootB;
    } else if (this.rank[rootA] > this.rank[rootB]) {
      this.parent[rootB] = rootA;
    } else {
      this.parent[rootB] = rootA;
      this.rank[rootA]++;
    }
    return true;
  }
}`,
  },
  {
    id: "js-l-16",
    title: "Dijkstra Shortest Path",
    language: "JavaScript",
    length: "long",
    topic: "graphs",
    tags: ["traversal"],
    difficulty: "hard",
    code: `function dijkstra(graph, source) {
  const distances = {};
  const visited = new Set();
  for (const node of Object.keys(graph)) {
    distances[node] = Infinity;
  }
  distances[source] = 0;

  while (visited.size < Object.keys(graph).length) {
    let closest = null;
    for (const node of Object.keys(graph)) {
      if (visited.has(node)) continue;
      if (closest === null || distances[node] < distances[closest]) {
        closest = node;
      }
    }
    if (closest === null || distances[closest] === Infinity) break;
    visited.add(closest);
    for (const edge of graph[closest]) {
      const candidate = distances[closest] + edge.weight;
      if (candidate < distances[edge.to]) {
        distances[edge.to] = candidate;
      }
    }
  }
  return distances;
}`,
  },
  {
    id: "js-l-17",
    title: "Topological Sort",
    language: "JavaScript",
    length: "long",
    topic: "graphs",
    tags: ["traversal"],
    difficulty: "hard",
    code: `function topologicalSort(graph) {
  const indegree = {};
  for (const node of Object.keys(graph)) {
    if (indegree[node] === undefined) indegree[node] = 0;
    for (const next of graph[node]) {
      indegree[next] = (indegree[next] || 0) + 1;
    }
  }

  const queue = [];
  for (const node of Object.keys(indegree)) {
    if (indegree[node] === 0) queue.push(node);
  }

  const order = [];
  let head = 0;
  while (head < queue.length) {
    const node = queue[head++];
    order.push(node);
    for (const next of graph[node] || []) {
      indegree[next]--;
      if (indegree[next] === 0) queue.push(next);
    }
  }
  return order;
}`,
  },
  {
    id: "js-l-18",
    title: "Spiral Matrix",
    language: "JavaScript",
    length: "long",
    topic: "matrix",
    tags: ["arrays"],
    difficulty: "hard",
    code: `function spiralOrder(matrix) {
  if (matrix.length === 0) return [];
  const out = [];
  let top = 0;
  let bottom = matrix.length - 1;
  let left = 0;
  let right = matrix[0].length - 1;

  while (top <= bottom && left <= right) {
    for (let i = left; i <= right; i++) {
      out.push(matrix[top][i]);
    }
    top++;
    for (let i = top; i <= bottom; i++) {
      out.push(matrix[i][right]);
    }
    right--;
    if (top <= bottom) {
      for (let i = right; i >= left; i--) {
        out.push(matrix[bottom][i]);
      }
      bottom--;
    }
    if (left <= right) {
      for (let i = bottom; i >= top; i--) {
        out.push(matrix[i][left]);
      }
      left++;
    }
  }
  return out;
}`,
  },
  {
    id: "js-l-19",
    title: "Rotate Matrix",
    language: "JavaScript",
    length: "long",
    topic: "matrix",
    tags: ["arrays"],
    difficulty: "hard",
    code: `function rotateMatrix(matrix) {
  const size = matrix.length;
  for (let row = 0; row < size; row++) {
    for (let col = row + 1; col < size; col++) {
      const temp = matrix[row][col];
      matrix[row][col] = matrix[col][row];
      matrix[col][row] = temp;
    }
  }
  for (const row of matrix) {
    let low = 0;
    let high = size - 1;
    while (low < high) {
      [row[low], row[high]] = [row[high], row[low]];
      low++;
      high--;
    }
  }
  return matrix;
}`,
  },
  {
    id: "js-l-20",
    title: "Permutations",
    language: "JavaScript",
    length: "long",
    topic: "recursion",
    tags: ["backtracking"],
    difficulty: "hard",
    code: `function permutations(nums) {
  const out = [];

  function build(current, remaining) {
    if (remaining.length === 0) {
      out.push([...current]);
      return;
    }
    for (let i = 0; i < remaining.length; i++) {
      current.push(remaining[i]);
      const rest = [
        ...remaining.slice(0, i),
        ...remaining.slice(i + 1),
      ];
      build(current, rest);
      current.pop();
    }
  }

  build([], nums);
  return out;
}`,
  },
  {
    id: "js-l-21",
    title: "Subsets",
    language: "JavaScript",
    length: "long",
    topic: "recursion",
    tags: ["backtracking"],
    difficulty: "hard",
    code: `function subsets(nums) {
  const out = [];

  function build(start, current) {
    out.push([...current]);
    for (let i = start; i < nums.length; i++) {
      current.push(nums[i]);
      build(i + 1, current);
      current.pop();
    }
  }

  build(0, []);
  return out;
}

function combinationSum(nums, target) {
  const out = [];
  function walk(start, current, total) {
    if (total === target) {
      out.push([...current]);
      return;
    }
    if (total > target) return;
    for (let i = start; i < nums.length; i++) {
      current.push(nums[i]);
      walk(i, current, total + nums[i]);
      current.pop();
    }
  }
  walk(0, [], 0);
  return out;
}`,
  },
  {
    id: "js-l-22",
    title: "N Queens",
    language: "JavaScript",
    length: "long",
    topic: "recursion",
    tags: ["backtracking"],
    difficulty: "hard",
    code: `function solveNQueens(n) {
  const solutions = [];
  const columns = [];

  function safe(row, col) {
    for (let r = 0; r < row; r++) {
      const c = columns[r];
      if (c === col) return false;
      if (Math.abs(c - col) === Math.abs(r - row)) {
        return false;
      }
    }
    return true;
  }

  function place(row) {
    if (row === n) {
      solutions.push([...columns]);
      return;
    }
    for (let col = 0; col < n; col++) {
      if (!safe(row, col)) continue;
      columns[row] = col;
      place(row + 1);
    }
  }

  place(0);
  return solutions;
}`,
  },
  {
    id: "js-l-23",
    title: "Longest Substring Without Repeats",
    language: "JavaScript",
    length: "long",
    topic: "trees",
    tags: ["recursion"],
    difficulty: "hard",
    code: `function lengthOfLongestSubstring(str) {
  const lastSeen = new Map();
  let best = 0;
  let start = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (lastSeen.has(ch) && lastSeen.get(ch) >= start) {
      start = lastSeen.get(ch) + 1;
    }
    lastSeen.set(ch, i);
    const width = i - start + 1;
    if (width > best) {
      best = width;
    }
  }
  return best;
}`,
  },
  {
    id: "js-l-24",
    title: "Edit Distance",
    language: "JavaScript",
    length: "long",
    topic: "dp",
    tags: ["optimisation"],
    difficulty: "hard",
    code: `function editDistance(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const table = [];
  for (let i = 0; i < rows; i++) {
    table.push(new Array(cols).fill(0));
  }
  for (let i = 0; i < rows; i++) {
    table[i][0] = i;
  }
  for (let j = 0; j < cols; j++) {
    table[0][j] = j;
  }
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      if (a[i - 1] === b[j - 1]) {
        table[i][j] = table[i - 1][j - 1];
      } else {
        table[i][j] = 1 + Math.min(
          table[i - 1][j],
          table[i][j - 1],
          table[i - 1][j - 1]
        );
      }
    }
  }
  return table[rows - 1][cols - 1];
}`,
  },
  {
    id: "js-l-25",
    title: "Coin Change",
    language: "JavaScript",
    length: "long",
    topic: "dp",
    tags: ["optimisation"],
    difficulty: "hard",
    code: `function coinChange(coins, amount) {
  const best = new Array(amount + 1).fill(Infinity);
  best[0] = 0;
  for (let value = 1; value <= amount; value++) {
    for (const coin of coins) {
      if (coin > value) continue;
      const candidate = best[value - coin] + 1;
      if (candidate < best[value]) {
        best[value] = candidate;
      }
    }
  }
  return best[amount] === Infinity ? -1 : best[amount];
}

function countWays(coins, amount) {
  const ways = new Array(amount + 1).fill(0);
  ways[0] = 1;
  for (const coin of coins) {
    for (let value = coin; value <= amount; value++) {
      ways[value] += ways[value - coin];
    }
  }
  return ways[amount];
}`,
  },
  {
    id: "js-l-26",
    title: "Knapsack",
    language: "JavaScript",
    length: "long",
    topic: "dp",
    tags: ["optimisation"],
    difficulty: "hard",
    code: `function knapsack(weights, values, capacity) {
  const count = weights.length;
  const table = [];
  for (let i = 0; i <= count; i++) {
    table.push(new Array(capacity + 1).fill(0));
  }
  for (let i = 1; i <= count; i++) {
    for (let cap = 0; cap <= capacity; cap++) {
      const skip = table[i - 1][cap];
      if (weights[i - 1] > cap) {
        table[i][cap] = skip;
      } else {
        const take = values[i - 1] + table[i - 1][cap - weights[i - 1]];
        table[i][cap] = Math.max(skip, take);
      }
    }
  }
  return table[count][capacity];
}`,
  },
  {
    id: "js-l-27",
    title: "Longest Increasing Subsequence",
    language: "JavaScript",
    length: "long",
    topic: "dp",
    tags: ["optimisation"],
    difficulty: "hard",
    code: `function lengthOfLIS(nums) {
  if (nums.length === 0) return 0;
  const best = new Array(nums.length).fill(1);
  let answer = 1;
  for (let i = 1; i < nums.length; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i] && best[j] + 1 > best[i]) {
        best[i] = best[j] + 1;
      }
    }
    if (best[i] > answer) {
      answer = best[i];
    }
  }
  return answer;
}`,
  },
  {
    id: "js-l-28",
    title: "Merge Intervals",
    language: "JavaScript",
    length: "long",
    topic: "arrays",
    tags: ["indexing"],
    difficulty: "hard",
    code: `function mergeIntervals(intervals) {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const out = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const previous = out[out.length - 1];
    if (current[0] <= previous[1]) {
      previous[1] = Math.max(previous[1], current[1]);
    } else {
      out.push(current);
    }
  }
  return out;
}

function totalCovered(intervals) {
  let total = 0;
  for (const span of mergeIntervals(intervals)) {
    total += span[1] - span[0];
  }
  return total;
}`,
  },
  {
    id: "js-l-29",
    title: "Quick Select",
    language: "JavaScript",
    length: "long",
    topic: "sorting",
    tags: ["arrays"],
    difficulty: "hard",
    code: `function quickSelect(nums, k) {
  const arr = [...nums];
  let low = 0;
  let high = arr.length - 1;
  const target = arr.length - k;

  while (low <= high) {
    const pivot = arr[high];
    let store = low;
    for (let i = low; i < high; i++) {
      if (arr[i] < pivot) {
        [arr[i], arr[store]] = [arr[store], arr[i]];
        store++;
      }
    }
    [arr[store], arr[high]] = [arr[high], arr[store]];
    if (store === target) return arr[store];
    if (store < target) low = store + 1;
    else high = store - 1;
  }
  return -1;
}`,
  },
  {
    id: "js-l-30",
    title: "Event Emitter",
    language: "JavaScript",
    length: "long",
    topic: "oop",
    tags: ["patterns"],
    difficulty: "hard",
    code: `class EventEmitter {
  constructor() {
    this.listeners = new Map();
  }
  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }
  off(event, handler) {
    const handlers = this.listeners.get(event);
    if (handlers === undefined) return;
    handlers.delete(handler);
    if (handlers.size === 0) {
      this.listeners.delete(event);
    }
  }
  emit(event, payload) {
    const handlers = this.listeners.get(event);
    if (handlers === undefined) return;
    for (const handler of [...handlers]) {
      handler(payload);
    }
  }
}`,
  },
  {
    id: "js-l-31",
    title: "Promise Pool",
    language: "JavaScript",
    length: "long",
    topic: "async",
    tags: ["timing"],
    difficulty: "hard",
    code: `async function promisePool(tasks, limit) {
  const results = new Array(tasks.length);
  let cursor = 0;

  async function worker() {
    while (cursor < tasks.length) {
      const index = cursor;
      cursor++;
      try {
        results[index] = await tasks[index]();
      } catch (err) {
        results[index] = err;
      }
    }
  }

  const workers = [];
  const count = Math.min(limit, tasks.length);
  for (let i = 0; i < count; i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return results;
}`,
  },
  {
    id: "js-l-32",
    title: "Rate Limiter",
    language: "JavaScript",
    length: "long",
    topic: "async",
    tags: ["timing"],
    difficulty: "hard",
    code: `class RateLimiter {
  constructor(limit, windowMs) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.hits = new Map();
  }
  allow(key) {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    const previous = this.hits.get(key) || [];
    const recent = previous.filter((time) => time > cutoff);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }
  reset(key) {
    this.hits.delete(key);
  }
}`,
  },
  {
    id: "js-l-33",
    title: "Observable Store",
    language: "JavaScript",
    length: "long",
    topic: "oop",
    tags: ["patterns"],
    difficulty: "hard",
    code: `function createStore(initialState) {
  let state = initialState;
  const subscribers = new Set();

  function getState() {
    return state;
  }

  function setState(update) {
    const next = typeof update === "function" ? update(state) : update;
    if (next === state) return;
    state = { ...state, ...next };
    for (const listener of [...subscribers]) {
      listener(state);
    }
  }

  function subscribe(listener) {
    subscribers.add(listener);
    return function unsubscribe() {
      subscribers.delete(listener);
    };
  }

  return { getState, setState, subscribe };
}`,
  },
];

export default javascriptSnippets;
