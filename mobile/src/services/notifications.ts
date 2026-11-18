import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch {
  // En entornos donde expo-notifications no esté disponible nativamente, fallar silenciosamente
}

/**
 * Solicita permisos de notificaciones locales al arrancar la app.
 */
export async function initNotifications(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('suministros-gas', {
        name: 'Monitor de Gas y Despensa',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch {
    return false;
  }
}

/**
 * Programa el sistema escalonado de alertas preventivas del Gas:
 * - Semana 2 (14 días): Advertencia preventiva
 * - Semana 3 (21 días): Alerta crítica
 * - Semana 4 (28 días): Recordatorio urgente
 * Si la fecha registrada ya tiene 14+ días transcurridos, dispara una notificación preventiva inmediata.
 */
export async function programarAlertasGas(nombreGas: string, fechaCompraIso: string): Promise<void> {
  try {
    const granted = await initNotifications();
    if (!granted) return;

    const fechaCompra = new Date(fechaCompraIso);
    const ahora = Date.now();
    const diasTranscurridos = Math.floor((ahora - fechaCompra.getTime()) / 86_400_000);

    // Si se registra una compra pasada que ya cumplió 14 o 21 días, emitir notificación local inmediata
    if (diasTranscurridos >= 21) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 ¡Alerta Crítica de Gas (3+ semanas)!',
          body: `Han pasado ${diasTranscurridos} días desde la compra de "${nombreGas}". Es muy probable que el gas esté por acabarse.`,
        },
        trigger: null,
      });
    } else if (diasTranscurridos >= 14) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚠️ Monitor de Gas: 2 semanas cumplidas',
          body: `Han pasado ${diasTranscurridos} días desde que se compró "${nombreGas}". Verifica el nivel del balón.`,
        },
        trigger: null,
      });
    }

    const hitos = [
      {
        dias: 14,
        title: '⚠️ Monitor de Gas (2 Semanas)',
        body: `Han pasado 14 días desde la compra de "${nombreGas}". Verifica el nivel del cilindro.`,
      },
      {
        dias: 21,
        title: '🚨 Alerta Crítica de Gas (3 Semanas)',
        body: `Ya van 21 días con "${nombreGas}". Coordina la próxima recarga para no quedar sin gas.`,
      },
      {
        dias: 28,
        title: '🔥 Recordatorio Urgente de Gas (4 Semanas)',
        body: `Han pasado 4 semanas desde la compra de "${nombreGas}". ¿Ya registraste el cambio de balón?`,
      },
    ];

    for (const hito of hitos) {
      const targetMs = fechaCompra.getTime() + hito.dias * 86_400_000;
      const secondsFromNow = Math.floor((targetMs - ahora) / 1000);
      if (secondsFromNow > 5) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: hito.title,
            body: hito.body,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: secondsFromNow,
          },
        });
      }
    }
  } catch {
    // Evitar bloqueo si el emulador rechaza programación de alarmas
  }
}

/**
 * Programa recordatorio local para un insumo de despensa según su umbral de días.
 */
export async function programarAlertaDespensa(
  nombreProducto: string,
  fechaCompraIso: string,
  diasAlerta: number,
): Promise<void> {
  try {
    const granted = await initNotifications();
    if (!granted) return;

    const fechaCompra = new Date(fechaCompraIso);
    const ahora = Date.now();
    const diasTranscurridos = Math.floor((ahora - fechaCompra.getTime()) / 86_400_000);

    if (diasTranscurridos >= diasAlerta) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📦 Revisión de Despensa',
          body: `"${nombreProducto}" fue comprado hace ${diasTranscurridos} días (umbral: ${diasAlerta} días). Revisa si falta reponer.`,
        },
        trigger: null,
      });
      return;
    }

    const targetMs = fechaCompra.getTime() + diasAlerta * 86_400_000;
    const secondsFromNow = Math.floor((targetMs - ahora) / 1000);
    if (secondsFromNow > 5) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📦 Revisión de Despensa',
          body: `Han pasado ${diasAlerta} días desde que compraste "${nombreProducto}". Revisa si necesitas anotarlo en Compras.`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: secondsFromNow,
        },
      });
    }
  } catch {
    // Ignorar fallo en simulador
  }
}
