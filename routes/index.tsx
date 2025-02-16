// export default function Home() {
//   return (
//     <div class="min-h-screen bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center">
//       <div class="max-w-screen-md mx-auto flex flex-col items-center justify-center bg-white p-10 rounded-lg shadow-xl">
//         <img
//           class="my-6 w-32 h-32"
//           src="/ambulance.svg"
//           alt="ambulance logo"
//         />
//         <h1 class="text-5xl font-bold text-gray-800 mb-6">
//           Welcome to AmbuLOL 🚑
//         </h1>
//         <a
//           href="/emt/practice"
//           class="btn btn-primary text-lg"
//         >
//           Start Practice
//         </a>
//       </div>
//     </div>
//   );
// }

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary to-secondary text-white">
      <div className="flex flex-col items-center gap-6">
        <div className="avatar">
          <div className="w-32 rounded-full">
            <img src="ambulance.svg" alt="EMS Logo" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-center">
          Welcome to EMS Practice Questions
        </h1>
        <p className="text-lg text-center">
          Prepare for your EMT and Paramedic exams with interactive practice
          questions.
        </p>
        <a href="/emt/practice">
          <button className="btn btn-primary btn-lg">Start Practice</button>
        </a>
      </div>
    </div>
  );
}
