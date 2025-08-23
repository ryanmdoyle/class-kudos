import { Location } from '@generated/prisma';
import { EnrollmentWithUserLocation } from '@/app/lib/types';
import { TravelButton } from './TravelButton';

export const StudentTravelLog = ({ enrollments, groupLocations }: { enrollments: EnrollmentWithUserLocation[], groupLocations: Location[] }) => {
  const inClass = enrollments.filter((e) => e.currentLocationId === null);
  const outOfClass = enrollments.filter((e) => e.currentLocationId !== null);

  return (
    <div className="p-4 min-h-full flex gap-6">
      {/* Main grid for in-class students */}
      <div className="flex-1 flex flex-col">
        <h2 className="text-xl font-semibold mb-4">In Class ({inClass.length})</h2>
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 auto-rows-max pb-4">
            {inClass.map(enrollment => (
              <TravelButton
                enrollment={enrollment}
                locations={groupLocations}
                key={enrollment.id}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Side column for out-of-class students - only show if there are students out */}
      {outOfClass.length > 0 && (
        <div className="w-64 border-l border-gray-200 pl-6 flex flex-col">
          <h2 className="text-xl font-semibold mb-4">Out of Class ({outOfClass.length})</h2>
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="flex flex-col gap-3">
              {outOfClass.map(enrollment => (
                <TravelButton
                  enrollment={enrollment}
                  locations={groupLocations}
                  key={enrollment.id}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};