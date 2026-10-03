//! Current Wi-Fi connection through the WLAN API (read only).
use serde::Serialize;
use windows::Win32::Foundation::HANDLE;
use windows::Win32::NetworkManagement::WiFi::{
    wlan_intf_opcode_current_connection, wlan_interface_state_connected, WlanCloseHandle,
    WlanEnumInterfaces, WlanFreeMemory, WlanOpenHandle, WlanQueryInterface, WLAN_CONNECTION_ATTRIBUTES,
    WLAN_INTERFACE_INFO_LIST,
};

#[derive(Debug, Serialize)]
pub struct Wifi {
    pub ssid: String,
    /// 0..100
    pub signal: u32,
}

pub fn current() -> Option<Wifi> {
    // SAFETY: every pointer returned by the WLAN API is freed with WlanFreeMemory and the
    // client handle is closed before returning; structures are only read while alive.
    unsafe {
        let mut version = 0u32;
        let mut handle = HANDLE::default();
        if WlanOpenHandle(2, None, &mut version, &mut handle) != 0 {
            return None;
        }
        let mut result = None;
        let mut list: *mut WLAN_INTERFACE_INFO_LIST = std::ptr::null_mut();
        if WlanEnumInterfaces(handle, None, &mut list) == 0 && !list.is_null() {
            let infos = std::slice::from_raw_parts((*list).InterfaceInfo.as_ptr(), (*list).dwNumberOfItems as usize);
            for info in infos.iter().filter(|i| i.isState == wlan_interface_state_connected) {
                let mut size = 0u32;
                let mut data: *mut std::ffi::c_void = std::ptr::null_mut();
                if WlanQueryInterface(handle, &info.InterfaceGuid, wlan_intf_opcode_current_connection, None, &mut size, &mut data, None) == 0
                    && !data.is_null()
                {
                    let attrs = &*(data as *const WLAN_CONNECTION_ATTRIBUTES);
                    let ssid = &attrs.wlanAssociationAttributes.dot11Ssid;
                    let n = (ssid.uSSIDLength as usize).min(ssid.ucSSID.len());
                    result = Some(Wifi {
                        ssid: String::from_utf8_lossy(&ssid.ucSSID[..n]).to_string(),
                        signal: attrs.wlanAssociationAttributes.wlanSignalQuality,
                    });
                    WlanFreeMemory(data);
                    break;
                }
            }
            WlanFreeMemory(list as *const _);
        }
        WlanCloseHandle(handle, None);
        result
    }
}
