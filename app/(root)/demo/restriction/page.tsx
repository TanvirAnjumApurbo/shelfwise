import { auth } from "@/auth";
import { redirect } from "next/navigation";
import RestrictionBanner from "@/components/RestrictionBanner";

export default async function DemoPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Demo banner */}
      <RestrictionBanner
        isRestricted={false}
        showDemo={true}
        restrictionReason="Demo: Outstanding library fines of $15.50. Please clear your dues or contact the library."
      />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Restriction Banner Demo
          </h1>

          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-yellow-800 mb-2">
                📋 Demo Information
              </h2>
              <p className="text-yellow-700">
                This page demonstrates what users will see when their account is
                restricted. The red banner above shows how the restriction
                notice appears.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-blue-800 mb-2">
                ✨ Features Demonstrated
              </h2>
              <ul className="text-blue-700 list-disc list-inside space-y-1">
                <li>Prominent red banner with warning icons</li>
                <li>Subtle blinking animation to draw attention</li>
                <li>Clear restriction reason and contact information</li>
                <li>Responsive design that works on all devices</li>
                <li>Dismissible demo mode (click X to dismiss)</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-green-800 mb-2">
                🎯 When This Appears
              </h2>
              <p className="text-green-700">
                The restriction banner automatically appears for users when:
              </p>
              <ul className="text-green-700 list-disc list-inside mt-2 space-y-1">
                <li>Their account is marked as restricted in the database</li>
                <li>They have outstanding fines or violations</li>
                <li>An admin has placed restrictions on their account</li>
                <li>They need to complete certain requirements</li>
              </ul>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-red-800 mb-2">
                📞 Contact Information Shown
              </h2>
              <div className="text-red-700">
                <p className="mb-2">
                  Users will see multiple ways to resolve restrictions:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    <strong>Email:</strong> library@university.edu
                  </li>
                  <li>
                    <strong>Phone:</strong> (555) 123-4567
                  </li>
                  <li>
                    <strong>In-Person:</strong> Library Front Desk
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
