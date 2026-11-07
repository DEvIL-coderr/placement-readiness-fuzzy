/**
 * Starter question bank (original wording). `frequency` (0-100) is an EDITORIAL estimate of how
 * often the topic appears in campus placement tests/interviews - admins should tune it with real
 * feedback from their own college's drives. No company attributions are made in the seed data.
 */
import { mulberry32 } from '../engine/simulate.js';

const mcq = (subject, difficulty, topic, text, options, correctIndex, explanation, frequency) => ({
  subject, type: 'mcq', difficulty, topic, text, options, correctIndex, explanation, frequency,
});
const desc = (subject, difficulty, topic, text, answer, frequency) => ({
  subject, type: 'descriptive', difficulty, topic, text, answer, frequency,
});

const RAW_QUESTIONS = [
  // ---------------- DSA ----------------
  mcq('dsa', 'easy', 'Searching', 'What is the time complexity of binary search on a sorted array of n elements?', ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'], 1, 'Each step halves the search space, so at most log2(n) comparisons are needed.', 95),
  mcq('dsa', 'easy', 'Stack & Queue', 'Which data structure follows the Last-In-First-Out (LIFO) principle?', ['Queue', 'Stack', 'Heap', 'Binary tree'], 1, 'A stack removes the most recently inserted element first.', 90),
  mcq('dsa', 'medium', 'Hashing', 'With a good hash function and a sensible load factor, the average time to look up a key in a hash table is:', ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], 0, 'Hashing maps a key directly to a bucket, giving expected constant-time lookup.', 92),
  mcq('dsa', 'medium', 'Sorting', 'Which of these sorting algorithms has a worst-case time complexity of O(n log n) and needs O(n) auxiliary space in its standard form?', ['Quick sort', 'Merge sort', 'Bubble sort', 'Insertion sort'], 1, 'Merge sort always divides evenly and merges using an extra array; quick sort degrades to O(n^2) in the worst case.', 85),
  mcq('dsa', 'medium', 'Trees', 'The inorder traversal of a binary search tree visits the keys in:', ['Descending order', 'Ascending order', 'Level order', 'Random order'], 1, 'Left subtree < node < right subtree, so inorder yields sorted ascending output.', 88),
  mcq('dsa', 'medium', 'Graphs', 'Which algorithm computes shortest paths from a single source in a graph with non-negative edge weights?', ['Kruskal', 'Prim', 'Dijkstra', 'Floyd-Warshall'], 2, "Dijkstra's algorithm greedily settles the nearest unvisited vertex; Floyd-Warshall is all-pairs, Kruskal and Prim build spanning trees.", 90),
  mcq('dsa', 'medium', 'Linked List', 'Which technique detects a cycle in a singly linked list using O(1) extra space?', ['Hash set of visited nodes', "Floyd's tortoise and hare", 'Recursion', 'Sorting the nodes'], 1, 'A slow and a fast pointer must meet inside a cycle if one exists.', 88),
  mcq('dsa', 'hard', 'Dynamic Programming', 'What is the time complexity of the standard bottom-up DP solution to the 0/1 knapsack problem with n items and capacity W?', ['O(n + W)', 'O(nW)', 'O(2^n)', 'O(n log W)'], 1, 'The table has n x W states, each computed in constant time (pseudo-polynomial).', 80),
  mcq('dsa', 'hard', 'Heaps', 'Building a binary heap from n unsorted elements using bottom-up heapify takes:', ['O(n log n)', 'O(n)', 'O(log n)', 'O(n^2)'], 1, 'Most nodes are near the leaves and sift down very little; the sum of work converges to O(n).', 75),
  desc('dsa', 'easy', 'Arrays & Linked Lists', 'What is the difference between an array and a linked list? When would you prefer each?', 'Arrays are contiguous: O(1) random access, O(n) insert/delete in the middle, cache friendly, fixed or amortised-resizable size. Linked lists use nodes with pointers: O(1) insert/delete when the node is known, O(n) access, extra memory for pointers, poor cache locality. Prefer arrays for indexed reads and iteration; prefer linked lists for frequent insertions/removals at known positions (e.g. queues, LRU caches).', 94),
  desc('dsa', 'medium', 'Hashing', 'How does a HashMap work internally and how are collisions handled?', 'A key is hashed to an integer, which is reduced to a bucket index (hash mod capacity). Collisions happen when different keys map to the same bucket; they are handled by chaining (each bucket holds a list/tree of entries) or open addressing (probing for the next free slot). When the load factor exceeds a threshold the table is resized and keys are rehashed to keep operations ~O(1) on average.', 93),

  // ---------------- Programming & Problem Solving ----------------
  mcq('coding', 'easy', 'Python Basics', 'In Python, what does len([1, 2, 3][1:]) return?', ['1', '2', '3', 'It raises an error'], 1, 'The slice [1:] returns [2, 3], whose length is 2.', 70),
  mcq('coding', 'easy', 'Python Basics', 'Which of the following Python data types is immutable?', ['list', 'dict', 'tuple', 'set'], 2, 'Tuples cannot be modified after creation; lists, dicts and sets can.', 85),
  mcq('coding', 'medium', 'Recursion', 'The naive recursive implementation of fib(n) = fib(n-1) + fib(n-2) has time complexity:', ['O(n)', 'O(n log n)', 'O(2^n)', 'O(n^2)'], 2, 'The recursion tree roughly doubles at each level, giving exponential time; memoization reduces it to O(n).', 88),
  mcq('coding', 'medium', 'Hashing Technique', 'Using a hash map, the Two-Sum problem (find two numbers adding to a target) can be solved in:', ['O(n) time', 'O(log n) time', 'O(n^2) time only', 'O(1) time'], 0, 'One pass: for each x, check whether target - x was already seen.', 92),
  mcq('coding', 'medium', 'Python Basics', 'What is the value of 7 // 2 in Python?', ['3.5', '3', '4', '2'], 1, '// is floor division, so 7 // 2 = 3.', 60),
  mcq('coding', 'hard', 'Sliding Window', 'Finding the maximum sum of any contiguous subarray of fixed size k in O(n) time is a classic use of:', ['Binary search', 'Sliding window', 'Topological sort', 'Backtracking'], 1, 'Slide the window by adding the new element and removing the old one in O(1) per step.', 78),
  desc('coding', 'medium', 'Linked List', 'How do you reverse a singly linked list? Explain the iterative approach and its complexity.', 'Keep three pointers: prev (initially null), curr (head) and next. In each step save curr.next, point curr.next to prev, then advance prev = curr and curr = next. When curr becomes null, prev is the new head. Time O(n), extra space O(1).', 90),

  // ---------------- OOP ----------------
  mcq('oop', 'easy', 'Fundamentals', 'Encapsulation means:', ['Hiding the implementation by compiling code', 'Bundling data and methods together and restricting direct access to the data', 'Creating many forms of one method', 'Deriving a class from another class'], 1, 'Encapsulation wraps state and behaviour in a class and exposes a controlled interface.', 90),
  mcq('oop', 'easy', 'Fundamentals', 'Which of the following is NOT one of the four pillars of OOP?', ['Inheritance', 'Polymorphism', 'Compilation', 'Abstraction'], 2, 'The four pillars are encapsulation, abstraction, inheritance and polymorphism.', 80),
  mcq('oop', 'medium', 'Polymorphism', 'Method overriding is an example of:', ['Compile-time polymorphism', 'Run-time polymorphism', 'Static binding', 'Operator overloading'], 1, 'Which overridden method runs is decided at run time by the actual object type.', 88),
  mcq('oop', 'medium', 'Java', 'In Java, which keyword prevents a class from being subclassed?', ['static', 'final', 'abstract', 'private'], 1, 'A final class cannot be extended.', 82),
  mcq('oop', 'medium', 'Abstraction', 'Which statement about abstract classes in Java is true?', ['They can be instantiated directly', 'They can contain both abstract and concrete methods', 'They cannot have constructors', 'They cannot have fields'], 1, 'Abstract classes may mix abstract and implemented methods, fields and constructors, but cannot be instantiated themselves.', 85),
  mcq('oop', 'medium', 'Fundamentals', 'A constructor is invoked automatically when:', ['An object is created', 'A class is declared', 'A method is called', 'The program ends'], 0, 'Constructors initialise a new object at creation time.', 80),
  mcq('oop', 'hard', 'Inheritance', 'The "diamond problem" arises in which kind of inheritance?', ['Single', 'Multilevel', 'Multiple', 'Hierarchical'], 2, 'With multiple inheritance a class can inherit the same base through two paths, creating ambiguity.', 78),
  desc('oop', 'medium', 'Abstraction', 'What is the difference between an abstract class and an interface?', 'An interface specifies a contract (method signatures, constants, and in modern languages default methods) that unrelated classes can implement; a class can implement many interfaces. An abstract class can hold state, constructors and partial implementation, but a class can extend only one (in Java). Use an interface for capabilities across hierarchies; use an abstract class to share code and state among closely related classes.', 91),
  desc('oop', 'easy', 'Polymorphism', 'Explain polymorphism with an example.', 'Polymorphism lets one interface represent many forms. Compile-time (overloading): area(int r) and area(int l, int b) in one class. Run-time (overriding): a Shape reference calls draw() and the Circle or Square override runs depending on the actual object. It makes code extensible because callers depend on the base type only.', 92),

  // ---------------- DBMS ----------------
  mcq('dbms', 'easy', 'SQL', 'Which SQL statement removes all rows from a table quickly without removing the table structure?', ['DELETE', 'DROP', 'TRUNCATE', 'REMOVE'], 2, 'TRUNCATE empties the table and keeps its definition; DROP removes the table entirely.', 85),
  mcq('dbms', 'easy', 'Keys', 'A primary key:', ['May contain NULL values', 'Uniquely identifies each row and cannot be NULL', 'Must be a string', 'Allows duplicate values'], 1, 'Primary keys enforce uniqueness and non-nullability.', 95),
  mcq('dbms', 'medium', 'Normalization', 'Which normal form removes partial dependencies on a composite key?', ['1NF', '2NF', '3NF', 'BCNF'], 1, '2NF requires that every non-key attribute depends on the whole key, not just part of it.', 90),
  mcq('dbms', 'medium', 'Transactions', 'In the ACID properties, the letter "I" stands for:', ['Integrity', 'Isolation', 'Indexing', 'Idempotence'], 1, 'Isolation ensures concurrent transactions do not interfere with each other.', 92),
  mcq('dbms', 'medium', 'SQL Joins', 'Which join returns all rows from the left table and the matching rows from the right table (NULLs when no match)?', ['INNER JOIN', 'LEFT JOIN', 'CROSS JOIN', 'SELF JOIN'], 1, 'LEFT (OUTER) JOIN preserves every left-table row.', 90),
  mcq('dbms', 'medium', 'Indexing', 'What is the main trade-off of adding an index to a table column?', ['Faster reads but slower writes and extra storage', 'Faster writes but slower reads', 'No trade-off', 'Reduced storage but slower reads'], 0, 'Indexes speed up lookups, but every insert/update must also maintain the index.', 88),
  mcq('dbms', 'medium', 'SQL', 'Which of the following is a DDL command?', ['SELECT', 'INSERT', 'CREATE', 'UPDATE'], 2, 'CREATE, ALTER and DROP define schema; SELECT/INSERT/UPDATE are DML.', 75),
  mcq('dbms', 'hard', 'Transactions', 'According to the SQL standard, which is the weakest isolation level that prevents non-repeatable reads?', ['Read Uncommitted', 'Read Committed', 'Repeatable Read', 'Serializable'], 2, 'Repeatable Read prevents dirty and non-repeatable reads (phantoms are still allowed by the standard).', 70),
  mcq('dbms', 'medium', 'NoSQL', 'In MongoDB, a collection is most similar to which relational concept?', ['Row', 'Table', 'Column', 'Index'], 1, 'A collection groups documents the way a table groups rows.', 72),
  desc('dbms', 'medium', 'Transactions', 'Explain the ACID properties with an example.', 'Atomicity: all steps of a transaction happen or none do (a bank transfer debits and credits together). Consistency: a transaction moves the database from one valid state to another (constraints hold). Isolation: concurrent transactions behave as if run serially. Durability: once committed, changes survive crashes (write-ahead logging).', 93),
  desc('dbms', 'medium', 'SQL vs NoSQL', 'What is the difference between SQL and NoSQL databases? When would you choose MongoDB?', 'SQL databases are relational with fixed schemas, joins and strong ACID guarantees. NoSQL databases (document, key-value, column, graph) have flexible schemas and scale horizontally more easily, often trading strict consistency for availability. Choose MongoDB when data is document-shaped and evolving (e.g. product catalogues, user profiles), and choose SQL for highly relational data needing multi-row transactions.', 90),

  // ---------------- Operating Systems ----------------
  mcq('os', 'easy', 'Scheduling', 'Which CPU scheduling algorithm is non-preemptive by definition?', ['Round Robin', 'First-Come First-Served (FCFS)', 'Shortest Remaining Time First', 'Preemptive Priority'], 1, 'FCFS lets a process run until it finishes or blocks.', 80),
  mcq('os', 'easy', 'Processes', 'Which of the following is NOT a standard process state?', ['Ready', 'Running', 'Waiting', 'Compiled'], 3, 'The classic states are new, ready, running, waiting/blocked and terminated.', 70),
  mcq('os', 'medium', 'Deadlock', 'How many conditions must hold simultaneously for a deadlock to occur (Coffman conditions)?', ['2', '3', '4', '5'], 2, 'Mutual exclusion, hold and wait, no preemption, circular wait.', 92),
  mcq('os', 'medium', 'Memory', 'Thrashing in an operating system refers to:', ['A CPU overheating', 'Excessive paging that leaves little time for useful work', 'A disk failure', 'Too many users logged in'], 1, 'When processes lack enough frames, the system spends most time swapping pages.', 85),
  mcq('os', 'medium', 'Memory', "Belady's anomaly can occur with which page replacement algorithm?", ['LRU', 'Optimal', 'FIFO', 'None of these'], 2, 'FIFO may incur more page faults with more frames; LRU and Optimal are stack algorithms.', 85),
  mcq('os', 'medium', 'Synchronization', 'A semaphore initialised to 1 and used to guarantee mutual exclusion is called a:', ['Counting semaphore', 'Binary semaphore', 'Monitor', 'Spinlock'], 1, 'A binary semaphore takes values 0 or 1 and guards a critical section.', 80),
  mcq('os', 'medium', 'Processes', 'Which resource do threads of the same process share?', ['Stack', 'Registers', 'Address space and open files', 'Program counter'], 2, 'Each thread has its own stack, registers and program counter but shares code, heap and files.', 90),
  mcq('os', 'hard', 'Scheduling', 'For a given set of processes that all arrive at the same time, which non-preemptive algorithm minimises the average waiting time?', ['FCFS', 'Shortest Job First', 'Round Robin', 'Priority scheduling'], 1, 'Running shorter jobs first minimises the cumulative waiting time.', 78),
  desc('os', 'medium', 'Deadlock', 'What is a deadlock and how can it be prevented or avoided?', 'A deadlock is a state where a set of processes each hold a resource and wait for another held by someone in the set. Prevention breaks one Coffman condition: e.g. request all resources at once (no hold-and-wait), allow preemption, or impose a global ordering on resources (no circular wait). Avoidance (Banker\'s algorithm) grants a request only if the system stays in a safe state. Detection and recovery is an alternative.', 93),
  desc('os', 'easy', 'Processes', 'What is the difference between a process and a thread?', 'A process is an independent program in execution with its own address space and resources. A thread is a lightweight unit of execution inside a process that shares the code, heap and open files with sibling threads but has its own stack and registers. Thread creation and context switches are cheaper, but shared memory needs synchronisation.', 94),

  // ---------------- Computer Networks ----------------
  mcq('cn', 'easy', 'Models', 'How many layers does the OSI reference model have?', ['4', '5', '7', '9'], 2, 'Physical, data link, network, transport, session, presentation, application.', 95),
  mcq('cn', 'easy', 'Application Layer', 'Which protocol translates domain names into IP addresses?', ['DHCP', 'DNS', 'ARP', 'FTP'], 1, 'The Domain Name System maps names like example.com to IP addresses.', 90),
  mcq('cn', 'medium', 'Transport Layer', 'Which statement about UDP is correct?', ['It guarantees in-order delivery', 'It establishes a connection before sending data', 'It does not guarantee delivery or ordering', 'It performs congestion control by default'], 2, 'UDP is connectionless and best-effort, with lower overhead than TCP.', 90),
  mcq('cn', 'medium', 'Application Layer', 'What is the default port number for HTTPS?', ['80', '8080', '443', '21'], 2, 'HTTPS uses TCP port 443; HTTP uses 80.', 85),
  mcq('cn', 'medium', 'Network Layer', 'Which layer of the OSI model is primarily responsible for routing packets between networks?', ['Data link', 'Network', 'Transport', 'Session'], 1, 'The network layer (IP) handles logical addressing and routing.', 88),
  mcq('cn', 'medium', 'Transport Layer', 'The correct sequence of the TCP three-way handshake is:', ['SYN, ACK, SYN-ACK', 'SYN, SYN-ACK, ACK', 'ACK, SYN, SYN-ACK', 'SYN-ACK, SYN, ACK'], 1, 'Client sends SYN, server replies SYN-ACK, client confirms with ACK.', 90),
  mcq('cn', 'medium', 'Devices', 'Which device forwards frames using MAC addresses at the data link layer?', ['Hub', 'Router', 'Switch', 'Repeater'], 2, 'A switch learns MAC addresses and forwards frames only to the right port.', 82),
  mcq('cn', 'hard', 'IP Addressing', 'How many usable host addresses are there in a /26 IPv4 subnet?', ['30', '62', '64', '126'], 1, '32 - 26 = 6 host bits; 2^6 - 2 = 62 usable addresses.', 80),
  desc('cn', 'medium', 'Application Layer', 'What happens when you type a URL into a browser and press Enter?', 'The browser checks caches, then DNS resolves the domain to an IP. A TCP connection is opened (three-way handshake) and, for HTTPS, a TLS handshake establishes encryption. The browser sends an HTTP request; the server responds with HTML, and the browser parses it, requests CSS/JS/images, builds the DOM/CSSOM and renders the page.', 96),
  desc('cn', 'easy', 'Transport Layer', 'Compare TCP and UDP.', 'TCP is connection-oriented, reliable (acknowledgements, retransmission), ordered, with flow and congestion control - used for web, email, file transfer. UDP is connectionless, unreliable and unordered but with very low overhead - used for DNS, streaming, gaming and VoIP where timeliness matters more than completeness.', 94),

  // ---------------- Web Development ----------------
  mcq('web', 'easy', 'HTTP', 'Which HTTP method is intended for retrieving a resource without side effects?', ['POST', 'GET', 'DELETE', 'PUT'], 1, 'GET is safe and idempotent: it should not change server state.', 85),
  mcq('web', 'easy', 'React', 'In React, calling a state setter (e.g. from useState) typically causes:', ['The page to reload', 'The component to re-render', 'The server to restart', 'Nothing until refresh'], 1, 'State updates schedule a re-render of the component and its children.', 85),
  mcq('web', 'medium', 'React', 'Which React hook is used to run side effects such as data fetching after render?', ['useMemo', 'useRef', 'useEffect', 'useContext'], 2, 'useEffect runs after render and can clean up when dependencies change.', 92),
  mcq('web', 'medium', 'Express', 'A typical Express middleware function has which signature?', ['(req, res, next)', '(data, callback)', '(app, server)', '(err, data)'], 0, 'Middleware receives the request, response and a next() callback; error handlers take four arguments.', 85),
  mcq('web', 'medium', 'Authentication', 'A JSON Web Token (JWT) consists of which three parts?', ['Header, payload, signature', 'Key, value, hash', 'Username, password, salt', 'Header, body, footer'], 0, 'JWTs are base64url-encoded header.payload.signature strings.', 85),
  mcq('web', 'medium', 'Node.js', 'How does Node.js handle many concurrent I/O operations with a single JavaScript thread?', ['By spawning a thread per request', 'Using an event loop with non-blocking I/O', 'By blocking until each request ends', 'Using multiple processes only'], 1, 'Node delegates I/O to the system and processes callbacks/promises on the event loop.', 90),
  mcq('web', 'medium', 'HTTP', 'Which HTTP status code indicates that a resource was successfully created?', ['200', '201', '204', '301'], 1, '201 Created is returned after a successful POST that creates a resource.', 80),
  mcq('web', 'hard', 'Security', 'Which statement about CORS is correct?', ['It is enforced by servers to block all clients', 'It is enforced by browsers and controlled through response headers such as Access-Control-Allow-Origin', 'It encrypts traffic between browser and server', 'It only applies to WebSocket connections'], 1, 'Browsers apply the same-origin policy and relax it only when the server sends suitable CORS headers.', 78),
  desc('web', 'medium', 'React', 'What is the virtual DOM and why does React use it?', 'The virtual DOM is a lightweight in-memory representation of the UI. When state changes React builds a new virtual tree, diffs it against the previous one (reconciliation) and applies only the minimal set of real DOM updates. This makes updates predictable and efficient compared with manipulating the DOM directly.', 92),
  desc('web', 'medium', 'Authentication', 'Explain how JWT-based authentication works in a MERN application.', 'On login the server verifies the credentials and returns a signed JWT containing the user id and role. The client stores it and sends it in the Authorization: Bearer header on each request. An Express middleware verifies the signature and expiry, loads the user and attaches it to req. Tokens should be short-lived, secrets kept server-side, and passwords stored hashed (bcrypt).', 91),

  // ---------------- Quantitative Aptitude ----------------
  mcq('quant', 'easy', 'Percentages', 'What is 20% of 250?', ['40', '50', '55', '60'], 1, '250 x 20 / 100 = 50.', 90),
  mcq('quant', 'easy', 'Averages', 'What is the average of 12, 18, 24, 30 and 36?', ['22', '24', '26', '28'], 1, 'Sum = 120, and 120 / 5 = 24.', 85),
  mcq('quant', 'medium', 'Time & Distance', 'A train 120 m long passes a pole in 6 seconds. What is its speed?', ['60 km/h', '72 km/h', '80 km/h', '90 km/h'], 1, '120 / 6 = 20 m/s = 20 x 3.6 = 72 km/h.', 85),
  mcq('quant', 'medium', 'Simple Interest', 'What is the simple interest on Rs. 5000 at 8% per annum for 3 years?', ['Rs. 1000', 'Rs. 1200', 'Rs. 1400', 'Rs. 1600'], 1, 'SI = 5000 x 8 x 3 / 100 = 1200.', 85),
  mcq('quant', 'medium', 'Time & Work', 'A can finish a job in 10 days and B in 15 days. Working together, how many days will they take?', ['5', '6', '7.5', '8'], 1, '1/10 + 1/15 = 1/6, so 6 days.', 92),
  mcq('quant', 'medium', 'Ratio', 'Rs. 600 is divided in the ratio 2 : 3 : 1. What is the largest share?', ['Rs. 200', 'Rs. 250', 'Rs. 300', 'Rs. 350'], 2, 'Total parts = 6; each part = 100; the largest share is 3 x 100 = 300.', 75),
  mcq('quant', 'medium', 'Profit & Loss', 'An article bought for Rs. 800 is sold for Rs. 920. What is the profit percentage?', ['12%', '15%', '18%', '20%'], 1, 'Profit = 120; 120 / 800 x 100 = 15%.', 85),
  mcq('quant', 'medium', 'Probability', 'Two fair dice are rolled. What is the probability that the sum is 7?', ['1/12', '1/6', '1/9', '5/36'], 1, 'There are 6 favourable outcomes out of 36, i.e. 1/6.', 80),
  mcq('quant', 'hard', 'Compound Interest', 'What is the compound interest on Rs. 10,000 at 10% per annum for 2 years, compounded annually?', ['Rs. 2000', 'Rs. 2100', 'Rs. 2200', 'Rs. 2310'], 1, '10000 x 1.1^2 = 12100, so CI = 2100.', 88),
  mcq('quant', 'hard', 'Number System', 'Two numbers have HCF 6 and LCM 180. If one number is 30, the other is:', ['24', '36', '42', '54'], 1, 'Product of numbers = HCF x LCM = 1080, so other = 1080 / 30 = 36.', 70),

  // ---------------- Logical Reasoning ----------------
  mcq('logical', 'easy', 'Series', 'Find the next number: 2, 4, 8, 16, ?', ['24', '30', '32', '64'], 2, 'Each term doubles.', 90),
  mcq('logical', 'easy', 'Odd One Out', 'Which one is the odd one out: Apple, Banana, Carrot, Mango?', ['Apple', 'Banana', 'Carrot', 'Mango'], 2, 'Carrot is a vegetable; the others are fruits.', 70),
  mcq('logical', 'medium', 'Series', 'Find the next number: 3, 6, 11, 18, 27, ?', ['36', '38', '40', '42'], 1, 'Differences are 3, 5, 7, 9, so the next difference is 11 and 27 + 11 = 38.', 80),
  mcq('logical', 'medium', 'Blood Relations', "Pointing to a man, Riya says, \"He is the son of my mother's only brother.\" How is the man related to Riya?", ['Brother', 'Cousin', 'Uncle', 'Nephew'], 1, "Her mother's brother's son is her maternal cousin.", 85),
  mcq('logical', 'medium', 'Directions', 'A person walks 5 km north, then 3 km east, then 5 km south. How far is he from the starting point?', ['3 km', '5 km', '8 km', '13 km'], 0, 'The north and south legs cancel, leaving 3 km east.', 85),
  mcq('logical', 'medium', 'Syllogism', 'All dogs are animals. All animals are living beings. Which conclusion definitely follows?', ['All living beings are dogs', 'All dogs are living beings', 'Some animals are not living beings', 'No dog is an animal'], 1, 'Dogs are a subset of animals, which are a subset of living beings.', 85),
  mcq('logical', 'medium', 'Coding-Decoding', 'In a certain code, ROAD is written as SPBE. How is LION written in that code?', ['MJPO', 'MKPO', 'LJPO', 'MJOP'], 0, 'Each letter is shifted one place forward: L-M, I-J, O-P, N-O.', 75),
  mcq('logical', 'hard', 'Clocks', 'What is the angle between the hour and minute hands of a clock at 4:30?', ['30 degrees', '45 degrees', '60 degrees', '75 degrees'], 1, 'Hour hand = 4 x 30 + 15 = 135 degrees; minute hand = 180 degrees; difference = 45 degrees.', 70),

  // ---------------- Verbal Ability ----------------
  mcq('verbal', 'easy', 'Vocabulary', 'Choose the synonym of "abundant".', ['Scarce', 'Plentiful', 'Rare', 'Tiny'], 1, 'Abundant means existing in large quantities.', 70),
  mcq('verbal', 'easy', 'Vocabulary', 'Choose the antonym of "ancient".', ['Old', 'Antique', 'Modern', 'Historic'], 2, 'Modern is the opposite of ancient.', 70),
  mcq('verbal', 'medium', 'Grammar', 'Choose the correct option: "Neither of the boys ___ present."', ['were', 'was', 'are', 'have been'], 1, '"Neither" takes a singular verb.', 85),
  mcq('verbal', 'medium', 'Grammar', 'Choose the correct word: "She has been working here ___ 2019."', ['for', 'since', 'from', 'by'], 1, '"Since" is used with a point in time.', 85),
  mcq('verbal', 'medium', 'Idioms', 'What does the idiom "break the ice" mean?', ['To damage something', 'To start a conversation in an awkward situation', 'To end a friendship', 'To work very hard'], 1, 'It means to ease tension at the beginning of a social interaction.', 75),
  mcq('verbal', 'medium', 'Voice', 'Which is the passive form of "The chef cooks the meal"?', ['The meal is cooked by the chef', 'The meal was cooked by the chef', 'The meal cooks the chef', 'The chef is cooked by the meal'], 0, 'Present simple active becomes "is/are + past participle" in the passive.', 80),
  mcq('verbal', 'medium', 'One-Word Substitution', 'One word for "a person who loves books":', ['Bibliophile', 'Philanthropist', 'Misanthrope', 'Egoist'], 0, 'A bibliophile is a lover of books.', 70),

  // ---------------- HR & Behavioural ----------------
  mcq('hr', 'easy', 'Self Introduction', 'When asked "Tell me about yourself", the best approach is to:', ['Recite your full life story', 'Give a concise summary of education, skills, relevant projects and goals linked to the role', 'Repeat your resume word for word', 'Talk only about hobbies'], 1, 'A focused 60-90 second summary tied to the role shows clarity and relevance.', 98),
  mcq('hr', 'medium', 'Weaknesses', 'Asked about your weakness, the strongest answer is to:', ['Say you have none', 'Name a real, manageable weakness and the steps you are taking to improve it', 'Name a strength disguised as a weakness', 'Name a skill critical for the job'], 1, 'Interviewers look for self-awareness and growth.', 92),
  mcq('hr', 'medium', 'Behavioural', 'What does the STAR method stand for?', ['Skill, Task, Attitude, Result', 'Situation, Task, Action, Result', 'Strategy, Target, Approach, Review', 'Situation, Team, Action, Reflection'], 1, 'STAR structures behavioural answers: Situation, Task, Action, Result.', 90),
  mcq('hr', 'medium', 'Motivation', 'Asked "Why should we hire you?", the best answer:', ['Says you need the job', 'Links your specific skills and a concrete project to the role requirements', 'Criticises other candidates', 'Says you will work for any salary'], 1, 'Evidence tied to the job requirements is persuasive.', 90),
  mcq('hr', 'medium', 'Teamwork', 'You disagree with a teammate on an approach. What is the best first step?', ['Escalate to the manager immediately', 'Discuss privately, focus on the problem rather than the person, and look for common ground', 'Ignore the issue', 'Do it your way without telling them'], 1, 'Constructive, fact-based communication resolves conflicts fastest.', 85),
  mcq('hr', 'medium', 'Negotiation', 'If asked about salary expectations early in the process, a good response is to:', ['Give an exact high number', 'Say money does not matter', 'Share a researched, flexible range and show interest in the overall role', 'Refuse to answer'], 2, 'Research-based, flexible answers keep negotiation open.', 75),
  desc('hr', 'easy', 'Self Introduction', 'Tell me about yourself. (Give a model structure.)', 'Present - current degree and strongest skills; Past - one or two relevant projects/internships with measurable outcomes; Future - the role you are targeting and why this company. Keep it to about a minute, avoid reciting the resume, and end with a hook that invites a follow-up question.', 99),
  desc('hr', 'medium', 'Motivation', 'Why do you want to join our company?', 'Research the company\'s products, culture and recent news, then connect two or three specifics to your skills and goals (e.g. their stack matches the MERN project you built). Show you want to contribute and learn, not just get a job.', 92),
];

export const SUBJECT_DESCRIPTIONS = {
  dsa: 'Arrays, linked lists, trees, graphs, hashing, sorting, dynamic programming.',
  coding: 'Language fundamentals and common problem-solving patterns.',
  oop: 'Encapsulation, inheritance, polymorphism, abstraction and design basics.',
  dbms: 'SQL, normalisation, transactions, indexing and NoSQL basics.',
  os: 'Processes, scheduling, synchronisation, deadlocks and memory management.',
  cn: 'OSI/TCP-IP layers, protocols, addressing and web request lifecycle.',
  web: 'HTTP, React, Node/Express, authentication and web security basics.',
  quant: 'Percentages, ratios, time-work-distance, interest, probability.',
  logical: 'Series, coding-decoding, blood relations, directions, syllogisms.',
  verbal: 'Vocabulary, grammar, idioms and sentence correction.',
  hr: 'Self-introduction, behavioural (STAR) and situational questions.',
};

/**
 * The hand-written bank above tends to put the right answer in slot B. Shuffle options with a
 * fixed seed so the bank has an even answer-position distribution (guessing "B" must not pay off)
 * while staying reproducible across seeds/environments.
 */
export const QUESTIONS = (() => {
  const rng = mulberry32(2026);
  return RAW_QUESTIONS.map((q) => {
    if (q.type !== 'mcq') return q;
    const order = q.options.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return { ...q, options: order.map((i) => q.options[i]), correctIndex: order.indexOf(q.correctIndex) };
  });
})();
