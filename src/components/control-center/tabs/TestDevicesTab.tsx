import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { TestDevice } from '../types';

interface TestDevicesTabProps {
  testDevices: TestDevice[];
  addDeviceOpen: boolean;
  setAddDeviceOpen: (v: boolean) => void;
  newDevice: { deviceId: string; name: string; platform: string };
  setNewDevice: (d: { deviceId: string; name: string; platform: string }) => void;
  addTestDevice: () => void;
  removeTestDevice: (id: string) => void;
}

export function TestDevicesTab({
  testDevices,
  addDeviceOpen,
  setAddDeviceOpen,
  newDevice,
  setNewDevice,
  addTestDevice,
  removeTestDevice,
}: TestDevicesTabProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Test Devices</h2>
        <Button variant="outline" onClick={() => setAddDeviceOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add
        </Button>
      </div>
      
      {addDeviceOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Test Device</h3>
            <div className="space-y-4">
              <div>
                <Label>Device ID</Label>
                <Input 
                  value={newDevice.deviceId} 
                  onChange={(e) => setNewDevice({ ...newDevice, deviceId: e.target.value })} 
                />
              </div>
              <div>
                <Label>Name</Label>
                <Input 
                  value={newDevice.name} 
                  onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })} 
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setAddDeviceOpen(false)}>Cancel</Button>
              <Button onClick={addTestDevice}>Add</Button>
            </div>
          </div>
        </div>
      )}
      
      {testDevices.length === 0 ? (
        <div className="p-8 text-center text-gray-500">No test devices</div>
      ) : (
        <div className="divide-y">
          {testDevices.map((d) => (
            <div key={d.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">{d.name}</div>
                <div className="text-sm text-gray-500 font-mono">{d.deviceId.slice(0, 20)}...</div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeTestDevice(d.id)} className="text-red-600">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

