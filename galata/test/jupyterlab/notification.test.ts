/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { expect, test } from '@jupyterlab/galata';

const NOTIFICATION_TYPE = [
  'default',
  'info',
  'success',
  'error',
  'warning',
  'in-progress'
];

test.describe('Toast', () => {
  for (const type of NOTIFICATION_TYPE) {
    test(`should display a ${type} notification`, async ({ page }) => {
      await page.evaluate(kind => {
        return window.jupyterapp.commands.execute('apputils:notify', {
          message: 'This is a test message',
          type: kind,
          options: { autoClose: false }
        });
      }, type);

      await page.waitForSelector('.Toastify__toast');

      expect(
        await page.locator('.Toastify__toast').screenshot({
          // Ensure consistency for in progress case
          animations: 'disabled'
        })
      ).toMatchSnapshot({
        name: `notification-${type}.png`
      });
    });
  }

  test('should display a notification with actions', async ({ page }) => {
    await page.evaluate(() => {
      return window.jupyterapp.commands.execute('apputils:notify', {
        message: 'This is a test message',
        options: {
          autoClose: false,
          actions: [
            {
              label: 'Button 1',
              commandId: 'apputils:notify',
              args: {
                message: 'Button 1 was clicked',
                type: 'success',
                options: { autoClose: false }
              }
            },
            {
              label: 'Button 2',
              commandId: 'apputils:notify',
              args: {
                message: 'Button 2 was clicked',
                type: 'success',
                options: { autoClose: false }
              }
            }
          ]
        }
      });
    });

    const handle = await page.waitForSelector('.Toastify__toast');

    expect(await handle.screenshot()).toMatchSnapshot({
      name: `notification-with-actions.png`
    });

    await Promise.all([
      handle.waitForElementState('hidden'),
      page.click('.Toastify__toast >> text=Button 2')
    ]);

    await expect(page.locator('.Toastify__toast').last()).toHaveText(
      'Button 2 was clicked'
    );
  });

  test('should display a markdown notification', async ({ page }) => {
    await page.evaluate(() => {
      return window.jupyterapp.commands.execute('apputils:notify', {
        message:
          'This _is_ a **Markdown** [message](https://jupyter.org).\n\n- Item 1\n- Item 2',
        options: { autoClose: false }
      });
    });

    await page.waitForSelector('.Toastify__toast');

    expect(
      await page.locator('.Toastify__toast').screenshot({
        // Ensure consistency
        animations: 'disabled'
      })
    ).toMatchSnapshot({
      name: `notification-markdown.png`
    });
  });

  test('should update a notification', async ({ page }) => {
    const id = await page.evaluate(() => {
      return window.jupyterapp.commands.execute('apputils:notify', {
        message: 'Simple note',
        options: { autoClose: false }
      });
    });

    await page.waitForSelector('.Toastify__toast >> text=Simple note');

    await page.evaluate(id => {
      return window.jupyterapp.commands.execute(
        'apputils:update-notification',
        {
          id,
          message: 'Updated message',
          type: 'success'
        }
      );
    }, id);

    await expect(page.locator('.Toastify__toast')).toHaveText(
      'Updated message'
    );
  });

  test('should dismiss a notification', async ({ page }) => {
    const id = await page.evaluate(() => {
      return window.jupyterapp.commands.execute('apputils:notify', {
        message: 'Simple note',
        options: { autoClose: false }
      });
    });

    await page.waitForSelector('.Toastify__toast >> text=Simple note');

    await Promise.all([
      page.waitForSelector('.Toastify__toast >> text=Simple note', {
        state: 'detached'
      }),
      page.evaluate(id => {
        return window.jupyterapp.commands.execute(
          'apputils:dismiss-notification',
          {
            id
          }
        );
      }, id)
    ]);
  });
});

test.describe('Notification center', () => {
  test('should display no notification by default', async ({ page }) => {
    const status = page.locator('.jp-Notification-Status');
    expect(await status.getAttribute('class')).not.toMatch(
      /\s?jp-mod-selected\s?/
    );
    await expect(status).toHaveText('0');

    await status.click();

    await expect(page.locator('.jp-Notification-Header')).toHaveText(
      'No notifications'
    );
  });

  test('should be highlighted for silent notification', async ({ page }) => {
    await page.evaluate(() => {
      return window.jupyterapp.commands.execute('apputils:notify', {
        message: 'Simple note'
      });
    });

    const status = page.locator('.jp-Notification-Status');
    expect(await status.getAttribute('class')).toMatch(/\s?jp-mod-selected\s?/);
    await expect(status).toHaveText('1');

    await status.click();

    await expect(page.locator('.jp-Notification-Header')).toHaveText(
      '1 notification'
    );
  });

  test('should be stop highlight once the center is closed', async ({
    page
  }) => {
    await page.evaluate(() => {
      return window.jupyterapp.commands.execute('apputils:notify', {
        message: 'Simple note'
      });
    });

    const status = page.locator('.jp-Notification-Status');

    await status.click();

    await expect(page.locator('.jp-Notification-Header')).toHaveText(
      '1 notification'
    );

    await page
      .locator('.jp-Notification-Header >> button[title="Hide notifications"]')
      .click();

    expect(await status.getAttribute('class')).not.toMatch(
      /\s?jp-mod-selected\s?/
    );
    await expect(status).toHaveText('1');
  });

  test('should forget dismissed notification', async ({ page }) => {
    await page.evaluate(async () => {
      await window.jupyterapp.commands.execute('apputils:notify', {
        message: 'Simple note 1'
      });
      await window.jupyterapp.commands.execute('apputils:notify', {
        message: 'Simple note 2'
      });
    });

    const status = page.locator('.jp-Notification-Status');
    await expect(status).toHaveText('2');

    await status.click();

    await expect(page.locator('.jp-Notification-Header')).toHaveText(
      '2 notifications'
    );

    await page
      .locator('.jp-Notification-List >> li >> [title="Dismiss notification"]')
      .first()
      .click();

    await expect(status).toHaveText('1');
  });

  test(`should display all kinds of notification`, async ({ page }) => {
    for (const type of NOTIFICATION_TYPE) {
      await page.evaluate(kind => {
        return window.jupyterapp.commands.execute('apputils:notify', {
          message: 'This is a _test_ [message](http://jupyter.org)',
          type: kind
        });
      }, type);
    }

    await page.evaluate(() => {
      return window.jupyterapp.commands.execute('apputils:notify', {
        message: 'This is a test message',
        options: {
          autoClose: false,
          actions: [
            {
              label: 'Button 1',
              commandId: 'apputils:notify',
              args: {
                message: 'Button 1 was clicked',
                type: 'success',
                options: { autoClose: false }
              }
            },
            {
              label: 'Button 2',
              commandId: 'apputils:notify',
              args: {
                message: 'Button 2 was clicked',
                type: 'success',
                options: { autoClose: false }
              }
            }
          ]
        }
      });
    });

    const status = page.locator('.jp-Notification-Status');
    await expect(status).toHaveText('7');

    await status.click();

    expect(
      await page.locator('.jp-Notification-Center').screenshot({
        // Ensure consistency for in progress case
        animations: 'disabled'
      })
    ).toMatchSnapshot({
      name: `notification-center.png`
    });
  });
});
