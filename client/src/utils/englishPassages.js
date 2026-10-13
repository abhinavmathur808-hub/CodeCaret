/* ═══════════════════════════════════════════════════════════════
   englishPassages.js — plain-English warm-up tracks
   ─────────────────────────────────────────────────────────────
   Written for CodeCaret: short pieces about motorsport, the history
   of programming and the craft of typing, for loosening up before
   racing code. They race like any catalogue track — same ids, same
   ghost, same per-track podium — but the server treats "English" as
   a warm-up: it never touches the rating or the global leaderboard
   (see WARMUP_LANGUAGES in server/routes/races.js).

   Lengths are set a little above the code corpus's (code medians:
   short 72, medium 258, long 533 characters), because prose is typed
   faster than code.

   AUTHORING RULES — every character must be one a keyboard can type
   directly: straight quotes, a plain hyphen, no dashes or accented
   letters. One paragraph per passage, no line breaks, single spaces.
   And as in the code files: no backtick, no "${", no backslash.
   ═══════════════════════════════════════════════════════════════ */

const passage = (id, title, length, code) => ({
  id,
  title,
  language: "English",
  length,
  topic: "warm-up",
  tags: ["prose"],
  difficulty: "easy",
  code,
});

const englishPassages = [
  /* ── Short ─────────────────────────────────────────────────── */
  passage("en-s-1", "Lights Out", "short",
    `Five red lights glow above the grid, one by one. When they all go out, the race begins and every driver launches at once.`),
  passage("en-s-2", "The Home Row", "short",
    `Rest your fingers on the home row. The small bumps on F and J let you find your place without looking down.`),
  passage("en-s-3", "Pit Stop", "short",
    `A modern pit crew can change all four tyres in under three seconds. Every member has one job and practises it hundreds of times.`),
  passage("en-s-4", "Accuracy First", "short",
    `Speed comes from accuracy. Type cleanly at a steady pace, and the fast laps will arrive on their own.`),
  passage("en-s-5", "The First Bug", "short",
    `In 1947, engineers working on the Harvard Mark II found a moth stuck in a relay and taped it into their logbook.`),
  passage("en-s-6", "Slipstream", "short",
    `Following close behind another car cuts the air resistance you face, which lets you build speed for a pass.`),
  passage("en-s-7", "Commit Often", "short",
    `Commit small changes often. A short, clear history is easier to read, review and undo than one giant change.`),
  passage("en-s-8", "The Racing Line", "short",
    `The fastest way through a corner is rarely the shortest. Drivers turn in wide, clip the apex and run out wide again.`),
  passage("en-s-9", "Name Things Well", "short",
    `Good names are the cheapest documentation you will ever write. Choose them as carefully as you choose your words.`),
  passage("en-s-10", "Warm Tyres", "short",
    `Racing tyres only grip properly once they are warm, which is why drivers weave from side to side on the way to the grid.`),
  passage("en-s-11", "Read the Error", "short",
    `Before you search for an answer, read the error message slowly. It often tells you exactly what went wrong.`),
  passage("en-s-12", "Chequered Flag", "short",
    `The chequered flag means the race is over. Cross the line under it, then take a slower lap back to the pits.`),
  passage("en-s-13", "Rubber Duck", "short",
    `Explaining your code out loud, even to a rubber duck, is a surprisingly good way to find the bug.`),
  passage("en-s-14", "Loose Hands", "short",
    `Relax your shoulders and keep your wrists light. Tension slows your fingers more than a tricky word ever will.`),

  /* ── Medium ────────────────────────────────────────────────── */
  passage("en-m-1", "The Formation Lap", "medium",
    `Before the start, the cars complete a formation lap behind the leader. Drivers swerve to warm their tyres and brake hard to heat the brakes. When they line up on the grid again, the mechanics are already gone and the track falls quiet. A few seconds later, five red lights come on, and everyone waits for them to go out.`),
  passage("en-m-2", "Ada Lovelace", "medium",
    `In 1843, Ada Lovelace published notes on Charles Babbage's Analytical Engine, a machine that was never fully built. Her notes included a method for calculating Bernoulli numbers, which is often called the first computer program. She also guessed that such machines might one day work with music and art, not only numbers.`),
  passage("en-m-3", "Practise Like a Driver", "medium",
    `Racing drivers spend hours in simulators learning every corner before they arrive at a new track. Typing works the same way. Short, focused sessions build muscle memory faster than long, tired ones. Warm up, race a few laps at a steady pace, then push for a personal best when your hands feel loose.`),
  passage("en-m-4", "What a Compiler Does", "medium",
    `A compiler reads your source code and turns it into instructions a machine can run. Along the way it checks that the pieces fit together, so many mistakes are caught before the program ever starts. The error messages may feel strict, but each one is a problem you did not have to find in production.`),
  passage("en-m-5", "Tyre Strategy", "medium",
    `Soft tyres are fast but wear out quickly, while hard tyres last longer but offer less grip. Teams plan their pit stops around this trade-off, and a well-timed change can win a race. Pit too early and the tyres fade before the finish; pit too late and a rival may pass you while you are stopped.`),
  passage("en-m-6", "The World Wide Web", "medium",
    `In 1989, Tim Berners-Lee proposed a system at CERN for sharing documents through links. By 1991 the first website was online, explaining what the web was and how to use it. Today billions of pages follow the same simple idea: a page, an address and a link to somewhere else.`),
  passage("en-m-7", "Reading Telemetry", "medium",
    `Every lap, a race car sends a stream of data back to the pit wall: speed, throttle, braking, tyre temperatures and more. Engineers compare it against earlier laps to see where time was won or lost. A good driver learns to read the same traces and change one small thing at a time.`),
  passage("en-m-8", "Version Control", "medium",
    `Version control keeps a record of every change to a project. If a new feature breaks something, you can see exactly what changed and when, then roll it back. It also lets many people work on the same code at once, each on their own branch, and merge their work together later.`),
  passage("en-m-9", "Braking Points", "medium",
    `Much of a lap is won or lost under braking. Drivers pick a marker before each corner, such as a sign or a mark on the tarmac, and hit the brakes at the same spot every lap. Brake a metre too late and the car runs wide; brake too early and the car behind is suddenly beside you.`),
  passage("en-m-10", "Grace Hopper", "medium",
    `Grace Hopper believed that programs should be written in words people could read. In the early 1950s she built one of the first compilers, and her work helped lead to COBOL, a language still used by banks today. She liked to say that it is easier to ask for forgiveness than to get permission.`),
  passage("en-m-11", "Rhythm Over Rush", "medium",
    `Fast typists rarely look rushed. Their fingers move in a steady rhythm, and each key lands at roughly the same pace as the one before. When you hit a hard word, slow down a little instead of hammering through it. Fixing one mistake costs far more time than typing the word carefully once.`),
  passage("en-m-12", "Safety Car", "medium",
    `When a crash leaves debris on the track, the safety car comes out and the field slows down behind it. Nobody may overtake while it leads, and the gaps between cars disappear. When it pulls into the pits, the race restarts and the leader controls the pace until the cars cross the line again.`),
  passage("en-m-13", "Caching", "medium",
    `Fetching data from far away is slow, so computers keep copies of things they use often close at hand. This trick is called caching. A browser caches images, a processor caches memory, and a server caches answers. The hard part is knowing when a copy has gone stale and needs to be thrown away.`),
  passage("en-m-14", "The Halo", "medium",
    `Since 2018, Formula One cars have carried a curved titanium bar called the halo above the cockpit. Some drivers disliked how it looked at first, but it has since protected drivers in several serious crashes. Safety changes often look strange at first and obvious a few years later.`),

  /* ── Long ──────────────────────────────────────────────────── */
  passage("en-l-1", "A Lap of the Track", "long",
    `A fast lap begins long before the first corner. The driver crosses the line at full throttle, already looking for the braking marker ahead. Down the straight the car reaches its top speed, the engine screaming and the wind pressing the driver into the seat. Then comes the hardest stop: a few hundred metres of braking, several gears down in a blur, and a turn of the wheel at exactly the right moment. Through the slow corners the driver is patient, waiting for the car to rotate before squeezing the throttle. Through the fast ones there is no time to think at all, only trust. At the end of the lap, a single number appears on the timing screen. Everything the driver did, good and bad, is folded into it.`),
  passage("en-l-2", "Unix and C", "long",
    `In 1969, Ken Thompson and Dennis Ritchie began building an operating system at Bell Labs. They called it Unix, and they made a set of choices that still shape computing today. Programs should do one thing well. They should work together, passing plain text from one to the next. To make Unix easier to move between machines, Ritchie created the C programming language, and the system was rewritten in it. That decision meant Unix could travel almost anywhere a C compiler existed. Linux, macOS, Android and many of the servers behind the web all carry ideas that began in that small lab more than fifty years ago.`),
  passage("en-l-3", "Learning to Touch Type", "long",
    `Most people learn to type by looking at the keyboard and using two or three fingers on each hand. It works, but it has a ceiling. Touch typing removes that ceiling by giving every key to one finger. Your fingers rest on the home row, and each one reaches up or down to the keys around it and then returns. At first it feels painfully slow, often slower than your old habits. Keep going anyway. After a week or two of short daily practice, the patterns start to move from your head into your hands. You stop thinking about where the letters are and start thinking only about the words. That is the moment speed begins to grow, and it keeps growing for as long as you practise.`),
  passage("en-l-4", "The Pit Wall", "long",
    `Behind every driver is a team watching the race from the pit wall. Strategists track the gaps to every rival and run thousands of simulations to decide when to stop for tyres. Engineers watch the health of the car, ready to warn the driver if temperatures climb or a sensor fails. The race engineer is the voice on the radio, choosing every word carefully, because a driver at full speed has very little attention to spare. Most messages are short: a lap time, a gap, a reminder to save fuel or to push. When the plan changes, the call has to be made in seconds, often with only half the information anyone would like. Races are won by drivers, but they are shaped by the people on that wall.`),
  passage("en-l-5", "How a Page Loads", "long",
    `When you type an address into a browser, a lot happens in the blink of an eye. First the browser asks the Domain Name System to turn the name into a numeric address, a little like looking up a number in a phone book. Then it opens a connection to that address and sends a request for the page. The server replies with HTML, the text and structure of the page, and the browser starts reading it right away. Inside it finds links to style sheets, scripts and images, and sends more requests for each of them. As the pieces arrive, the browser lays out the page, paints it on the screen and runs the scripts that make it interactive. On a fast connection, all of this takes less than a second.`),
  passage("en-l-6", "Racing in the Rain", "long",
    `Rain changes everything about a race. The track loses grip, the spray from the car ahead hides the braking markers, and the usual racing line becomes the slipperiest part of the road. Teams must decide when to switch from slick tyres to intermediates, or to full wets if the water keeps rising. Call it too early and the driver wastes time on the wrong rubber; call it too late and the car slides off at the first corner. Some drivers are at their best in these conditions. They search for grip in unusual places, brake earlier and more gently, and keep the car balanced instead of fighting it. A wet race often shows who is truly fast, because the car can no longer do all the work.`),
  passage("en-l-7", "Testing Your Code", "long",
    `Every program has bugs, and the only question is who finds them first. Automated tests give you a head start. A unit test checks one small piece of code in isolation: given this input, it should return that output. An integration test checks that several pieces work together, such as a function that reads from a database and writes a report. Tests do not prove that a program is correct, but they make change much safer. When you fix a bug, write a test that would have caught it, and that bug can never quietly return. Over time, a good test suite becomes a safety net that lets you move quickly, because you will hear about a mistake within minutes instead of weeks.`),
  passage("en-l-8", "The Keyboard Layout", "long",
    `The QWERTY layout on most keyboards was designed for typewriters in the 1870s. Its inventor, Christopher Latham Sholes, arranged the keys partly to stop the metal arms of the machine from jamming when common letter pairs were typed quickly. Typewriters have long since left most offices, but the layout stayed, because millions of people had already learned it. Other layouts, such as Dvorak and Colemak, place the most common letters on the home row and aim to reduce how far your fingers travel. Some typists swear by them. For most people, though, the layout matters far less than practice. A skilled typist on QWERTY will beat a beginner on any other layout, every single time.`),
  passage("en-l-9", "The Art of Overtaking", "long",
    `Overtaking is the hardest skill in racing to teach. It begins laps before the move itself, as the driver studies the car ahead, looking for a corner where the rival is weak. Perhaps they brake a little early into the hairpin, or lose speed on the exit of the final turn. The attacker sets up the move by staying close, then uses the slipstream on the straight to draw alongside. The braking zone decides it. Go too deep and both cars may end up in the gravel; stay too cautious and the gap closes again. The best passes look simple from the outside because the hard work was done before anyone noticed. Patience, it turns out, is one of the fastest tools a driver has.`),
  passage("en-l-10", "Open Source", "long",
    `Much of the software that runs the world is open source, which means anyone can read the code, use it and suggest changes. Linus Torvalds released the first version of the Linux kernel in 1991 as a hobby project, and thousands of people around the world now help to maintain it. Open source works because many eyes can spot problems that one team might miss, and because improvements made by one company can help everyone else. It is not free for the people who do the work, though. Maintainers review patches, answer questions and fix urgent security issues, often in their spare time. If you use open source tools, reporting a clear bug or improving the documentation is a fine way to give something back.`),
  passage("en-l-11", "Fitness Behind the Wheel", "long",
    `Formula One drivers are among the fittest athletes in sport, even though they spend the race sitting down. Under heavy braking their bodies feel forces of around five times their own weight, and in fast corners their necks must hold their heads steady against similar loads. The cockpit is hot, a race can last close to two hours, and drivers lose a surprising amount of water through sweat. To cope, they train their necks with special equipment, build endurance with long runs and cycling, and sharpen their reactions with drills that light up targets at random. Typing is far gentler, but the same idea applies. A relaxed, healthy body makes fewer mistakes, so take breaks, stretch your hands and keep a glass of water nearby.`),
  passage("en-l-12", "Writing Readable Code", "long",
    `Code is read far more often than it is written, so it pays to write for the reader. Start with names. A variable called total says more than one called t, and a function called sendInvoice tells you what it does before you open it. Keep functions short enough to understand in one sitting, and give each of them a single job. When a block of logic needs a comment to explain what it does, consider turning it into a function with a good name instead. Save your comments for explaining why, which the code itself cannot tell you. Finally, be consistent. A codebase that follows one style, even an imperfect one, is easier to work in than a collection of clever ideas that all disagree.`),
];

export default englishPassages;
