import { Alert as RNAlert, AlertButton, Platform } from 'react-native';

function webAlert(title: string, message?: string, buttons?: AlertButton[]) {
  const text = [title, message].filter(Boolean).join('\n\n');
  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }
  const cancel = buttons.find((b) => b.style === 'cancel');
  const confirm = buttons.find((b) => b.style !== 'cancel') ?? buttons[buttons.length - 1];
  if (window.confirm(text)) confirm.onPress?.();
  else cancel?.onPress?.();
}

export const Alert = {
  alert: (title: string, message?: string, buttons?: AlertButton[]) =>
    Platform.OS === 'web' ? webAlert(title, message, buttons) : RNAlert.alert(title, message, buttons),
};
