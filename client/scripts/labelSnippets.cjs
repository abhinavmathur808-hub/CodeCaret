/* ══════════════════════════════════════════════════════════════
   labelSnippets — stamps topic / tags / difficulty onto every
   snippet in the dataset.

   Why a script rather than hand-editing: there are 400+ snippets
   across three files. Hand-labelling that many is slow, and worse,
   inconsistent — the hundredth "reverse a list" gets a different
   topic from the first. A rules table applies one judgement
   everywhere, and re-running it after adding snippets keeps the
   whole corpus in step.

   Rules are ordered and the FIRST match wins, so put specific
   patterns above general ones ("linked list merge sort" must be
   seen before "merge sort"). The script fails loudly if any
   snippet goes unmatched rather than silently defaulting, because
   a wrong-but-plausible label is harder to spot than a missing one.

     node scripts/labelSnippets.cjs          # rewrite in place
     node scripts/labelSnippets.cjs --check  # report only
   ══════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");

const FILES = [
  "src/utils/codeSnippets.js",
  "src/utils/javascriptSnippets.js",
  "src/utils/extraSnippets.js",
  "src/utils/topicFillSnippets.js",
];

/* Topics that are inherently demanding regardless of how few lines
   they take — a 12-line Dijkstra is not an easy snippet. */
const ADVANCED_TOPICS = new Set(["graphs", "dp", "trees", "heap"]);

/* Titles that are hard whatever their length or topic. */
const HARD_TITLES =
  /(kmp|avl|segment tree|fenwick|matrix chain|n[- ]?queens|bellman|floyd|kruskal|prim|sudoku|red[- ]black|dijkstra|topological|union[- ]find|dsu|trie|lru|edit distance|promise pool|event emitter|observable)/i;

/* ── Exact-title overrides ───────────────────────────────────
   Checked before RULES. These are titles where the keyword rules
   either miss entirely or would land on a defensible-but-wrong
   bucket — "Heapify Array In Place" reads as `arrays` to a keyword
   matcher, for instance, when it is plainly a heap exercise.

   Preferred over widening the regexes: a broader pattern here
   would silently re-label snippets elsewhere in the corpus, and a
   wrong-but-plausible label is far harder to notice than a
   missing one. */
const EXPLICIT = {
  // Concurrency
  "Atomic Counter Increment": ["async", ["concurrency"]],
  "Condition Variable Wait": ["async", ["concurrency"]],
  "Producer Consumer Buffer": ["async", ["concurrency"]],

  // Heaps
  "Heapify Array In Place": ["heap", ["data-structures"]],
  "Running Median Two Heaps": ["heap", ["data-structures"]],
  "Binary Heap Class": ["heap", ["data-structures"]],
  "Heapify List In Place": ["heap", ["data-structures"]],

  // Object-oriented patterns
  "Singleton Logger Class": ["oop", ["patterns"]],
  "Singleton Config Class": ["oop", ["patterns"]],
  "Observer Pattern Class": ["oop", ["patterns"]],
  "Operator Overloading Vector2": ["oop", ["patterns"]],
  "Operator Style Vector Class": ["oop", ["patterns"]],

  // Recursion
  "Ackermann Function": ["recursion", ["backtracking"]],
  "Partition Function Recursion": ["recursion", ["backtracking"]],

  // Functional idioms
  "Partial Sum Scan": ["functional", ["idioms"]],
  "Any Of All Of Predicates": ["functional", ["idioms"]],
  "Sort With Custom Comparator": ["functional", ["idioms"]],

  // Searching
  "Ternary Search Unimodal": ["searching", ["arrays"]],
  "Exponential Search": ["searching", ["arrays"]],
  "Jump Search": ["searching", ["arrays"]],
  "Bisect Insert Position": ["searching", ["arrays"]],

  // Dynamic programming
  "House Robber DP": ["dp", ["optimisation"]],
  "Unique Paths Grid DP": ["dp", ["optimisation"]],

  // Trees
  "Tree Diameter Recursion": ["trees", ["recursion"]],
  "Invert Binary Tree": ["trees", ["recursion"]],

  // Hashing
  "Longest Consecutive Sequence Hash": ["hashing", ["counting"]],

  // Graphs
  "Graph Shortest Unweighted Path": ["graphs", ["traversal"]],

  // Strings
  "Caesar Cipher Shift": ["strings", ["text"]],
};

/* ── Classification rules — first match wins ────────────────── */
const RULES = [
  // Specific composites, before their generic parts.
  [/linked list merge sort/i, "linked-list", ["sorting", "recursion"]],
  [/power set.*bit|bit.*power set/i, "bits", ["recursion", "subsets"]],
  [/heap sort/i, "sorting", ["heap"]],
  [/two sum.*(dictionary|unordered_map|hash)/i, "hashing", ["arrays"]],

  // Async / timing / concurrency.
  [/(sleep|debounce|throttle|retry|promise|async|await|rate limiter|token bucket|mutex|thread|concurren|poll until|timeout wrapper)/i, "async", ["timing"]],

  // Object-oriented / stateful classes.
  [/(event emitter|observable store|context manager|decorator function|bank account|shape inheritance|dataclass|circular buffer|inheritance hierarchy)/i, "oop", ["patterns"]],

  // Heaps — before the generic "top k" / queue patterns below.
  [/(heapq|heap top k|priority queue|min heap|max heap|heap sift)/i, "heap", ["data-structures"]],

  // Grid flood/island search — recursion over a matrix, but the
  // exercise is really connected-component traversal.
  [/(count islands|flood fill)/i, "graphs", ["grid", "recursion"]],

  // Functional programming idioms.
  [/(memoize|compose|deep clone|map function|filter even|list comprehension|dictionary comprehension|generator function|group by|reduce|zip two|enumerate|remove falsy|pick random|range array|head and tail)/i, "functional", ["idioms"]],

  // Graphs.
  [/(dijkstra|bellman|floyd|kruskal|prim|topological|graph traversal|bfs|dfs|breadth first|depth first|graph coloring|graph class|union[- ]find|dsu)/i, "graphs", ["traversal"]],

  // Dynamic programming.
  [/(knapsack|longest common subsequence|longest increasing|edit distance|coin change|matrix chain|climbing stairs|best time to buy|maximum subarray|kadane)/i, "dp", ["optimisation"]],

  // Trees & tries.
  [/(binary search tree|bst|avl|trie|segment tree|fenwick|inorder|preorder|postorder|level order|tree traversal|tree height|validate bst)/i, "trees", ["recursion"]],

  // Heaps.
  [/(min heap|max heap|priority queue)/i, "heap", ["data-structures"]],

  // Linked lists.
  [/linked list/i, "linked-list", ["pointers"]],

  // Stacks & queues.
  [/(stack|queue|valid parentheses|next greater)/i, "stack-queue", ["data-structures"]],

  // Matrices.
  [/(matrix|spiral|sudoku|transpose)/i, "matrix", ["arrays"]],

  // Sorting & selection.
  [/(bubble sort|selection sort|insertion sort|merge sort|quick sort|counting sort|radix sort|quick select|shuffle|dutch national flag)/i, "sorting", ["arrays"]],

  // Searching.
  [/(binary search|linear search|lower bound|upper bound|search in rotated)/i, "searching", ["arrays"]],

  // Backtracking / recursion.
  [/(n[- ]?queens|permutation|subsets|power set|backtrack|tower of hanoi|hanoi)/i, "recursion", ["backtracking"]],

  // Hashing / sets / frequency counting.
  [/(word frequency|first unique|contains duplicate|array intersection|set intersection|count occurrences|count character frequency|lru cache|anagram)/i, "hashing", ["counting"]],

  // Strings.
  [/(string|palindrome check|vowel|capitalize|truncate|longest common prefix|longest substring|reverse words|uppercase|lowercase|toggle character|kmp|pattern matching)/i, "strings", ["text"]],

  // Bit manipulation.
  [/(xor|nth bit|set bits|power of two|binary to decimal|gray code|bit)/i, "bits", ["binary"]],

  // Arrays — the general bucket for list mechanics.
  [/(array|list|two sum|two pointer|sliding window|move zeroes|product except self|missing number|merge intervals|chunk|flatten|unique values|sum an array|average|remove duplicates|rotate)/i, "arrays", ["indexing"]],

  // Maths & number theory.
  [/(gcd|lcm|greatest common divisor|least common multiple|factorial|fibonacci|sieve|prime|exponent|power|square root|digits|leap year|reverse number|reverse integer|palindrome number|celsius|fahrenheit|radians|area of|distance between|random integer|integer power|ceil division|perfect square|round to nearest)/i, "math", ["numbers"]],

  // Everything left is an elementary one-liner.
  [/(max of|min of|is even|absolute|clamp|sign function|swap|last element|is empty|fizzbuzz)/i, "basics", ["fundamentals"]],
];

function classify(title) {
  const exact = EXPLICIT[title];
  if (exact) return { topic: exact[0], tags: exact[1] };

  for (const [pattern, topic, tags] of RULES) {
    if (pattern.test(title)) return { topic, tags };
  }
  return null;
}

function difficultyFor(title, topic, length) {
  if (HARD_TITLES.test(title)) return "hard";
  if (length === "long") return "hard";
  if (length === "medium") return ADVANCED_TOPICS.has(topic) ? "hard" : "medium";
  return ADVANCED_TOPICS.has(topic) ? "medium" : "easy";
}

/* Matches one whole snippet object, from `id` through the closing
   backtick of `code`. Capturing the code as well as the header lets
   the script derive `length` from the real line count instead of
   trusting the hand-written value — 14 snippets were in the wrong
   band on the first pass, and a mislabelled band quietly breaks the
   Short/Medium/Long filter. */
const SNIPPET =
  /(\n(\s*)id: "([^"]+)",\n\s*title: "([^"]+)",\n\s*language: "([^"]+)",\n\s*)length: "([^"]+)",((?:\n\s*(?:topic|tags|difficulty):[^\n]*)*)(\n\s*code: `)([\s\S]*?)(`,\n)/g;

/** The band a snippet belongs to, from how many lines it actually is. */
function lengthFor(code) {
  const lines = code.split("\n").length;
  if (lines <= 5) return "short";
  if (lines <= 15) return "medium";
  return "long";
}

const root = path.join(__dirname, "..");
const checkOnly = process.argv.includes("--check");

let total = 0;
const unmatched = [];
const rebanded = [];
const byTopic = {};
const byDifficulty = {};
const byLength = {};

for (const rel of FILES) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) continue;

  const before = fs.readFileSync(file, "utf8");
  const after = before.replace(
    SNIPPET,
    (_m, head, indent, id, title, _lang, oldLength, _old, codeOpen, code, codeClose) => {
      total++;
      const length = lengthFor(code);
      if (length !== oldLength) {
        rebanded.push(`${id} — ${title}: ${oldLength} -> ${length}`);
      }

      const hit = classify(title);
      if (!hit) {
        unmatched.push(`${id} — ${title}`);
        return `${head}length: "${length}",${codeOpen}${code}${codeClose}`;
      }

      const difficulty = difficultyFor(title, hit.topic, length);
      byTopic[hit.topic] = (byTopic[hit.topic] || 0) + 1;
      byDifficulty[difficulty] = (byDifficulty[difficulty] || 0) + 1;
      byLength[length] = (byLength[length] || 0) + 1;

      const tags = hit.tags.map((t) => `"${t}"`).join(", ");
      return (
        `${head}length: "${length}",` +
        `\n${indent}topic: "${hit.topic}",` +
        `\n${indent}tags: [${tags}],` +
        `\n${indent}difficulty: "${difficulty}",` +
        `${codeOpen}${code}${codeClose}`
      );
    }
  );

  if (!checkOnly && after !== before) fs.writeFileSync(file, after);
  console.log(`${checkOnly ? "checked" : "labelled"} ${rel}`);
}

console.log(`\nsnippets seen: ${total}`);
console.log("by topic:", JSON.stringify(byTopic, null, 1));
console.log("by length:", JSON.stringify(byLength));
console.log("by difficulty:", JSON.stringify(byDifficulty));

if (rebanded.length > 0) {
  console.log(`\nre-banded by real line count (${rebanded.length}):`);
  rebanded.forEach((r) => console.log("  " + r));
}

if (unmatched.length > 0) {
  console.error(`\nUNMATCHED (${unmatched.length}):`);
  unmatched.forEach((u) => console.error("  " + u));
  process.exit(1);
}
console.log("\nevery snippet matched a rule");
